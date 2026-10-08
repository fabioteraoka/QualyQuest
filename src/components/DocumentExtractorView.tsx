import React, { useState } from 'react';
import { 
  Sparkles, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Eye, 
  ShieldCheck,
  Zap,
  FileType
} from 'lucide-react';
import { NCRecord } from '../types';
import { formatarData, obterCorRisco } from '../utils/qualityHelpers';
import { parseRNCLocalHeuristics } from '../utils/sgqExtractor';
import { extractTextFromWordFile, isWordDocument } from '../utils/wordExtractor';
import { useAuth } from '../contexts/AuthContext';

interface DocumentExtractorViewProps {
  onSaveExtracted: (nc: NCRecord) => void;
  onEditExtracted?: (nc: NCRecord) => void;
  onCancel: () => void;
}

// Helper seguro para criar arquivo de teste sem disparar "Illegal constructor" em WebViews/browsers
const createSafeTestFile = (content: string, name: string, type: string): File => {
  try {
    return new File([content], name, { type });
  } catch {
    const blob = new Blob([content], { type });
    return Object.assign(blob, {
      name,
      size: content.length,
      lastModified: Date.now(),
      webkitRelativePath: '',
    }) as unknown as File;
  }
};

export const DocumentExtractorView: React.FC<DocumentExtractorViewProps> = ({
  onSaveExtracted,
  onEditExtracted,
  onCancel,
}) => {
  const { userProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileMimeType, setFileMimeType] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [parsingWord, setParsingWord] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<NCRecord> | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Wizard step state: 1: Upload, 2: Extração, 3: Revisão, 4: Cadastro
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    if (file.size === 0) {
      setErrorMsg('O documento selecionado está vazio (0 bytes). Selecione um arquivo válido.');
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`O arquivo excede o limite máximo permitido de 50 MB (tamanho: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setSuccessNotice(null);

    // If it's a Word document (.docx / .doc), extract text in browser immediately
    if (isWordDocument(file.name, file.type)) {
      setParsingWord(true);
      try {
        const textFromDocx = await extractTextFromWordFile(file);
        if (textFromDocx && textFromDocx.length > 0) {
          setPastedText(textFromDocx);
          setSuccessNotice(`Documento Word (${file.name}) processado! ${textFromDocx.length} caracteres extraídos prontos para estruturação.`);
        } else {
          setSuccessNotice(`Arquivo Word (${file.name}) carregado para análise pelo motor IA.`);
        }
      } catch (wordErr) {
        console.warn('Word file browser extraction warning:', wordErr);
      } finally {
        setParsingWord(false);
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setFileBase64(b64);
      setFileMimeType(file.type || (isWordDocument(file.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'));
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // One-click demo with user's exact uploaded FAA file
  const handleLoadSampleFAA = () => {
    setPastedText(`REGISTRO DE NÃO CONFORMIDADE
REGISTRO DE NÃO CONFORMIDADE, AÇÃO CORRETIVA OU PREVENTIVA
Data Emissão: 02/09/2025 Revisão: 00 Página: 1 de 1
F 001-29 R00 02/09/2025
Título: Pré Auditoria FAA Preventiva ( )
Nº da NC: 05 Corretiva (x)
1. DESCRIÇÃO DA NÃO CONFORMIDADE
Planilha de controle de calibração de REC, estava desatualizada.
Planilhas de controle de calibração descentralizadas entre bases e com alimentação manual por base, ocorrendo diferenças de controle entre bases.
Não-conforme ao MOMQ 3.4.3.
Avaliação de Risco (Severidade x Probabilidade): 2C
Prazo de Resposta da NC: 31/08/2026
Data: 11/08/2026 Auditor: Paulo Okubo
2. PRÉ-ANÁLISE DA CAUSA E AÇÃO DE CONTENÇÃO:
3. ANÁLISE DA CAUSA RAIZ:
4. AÇÃO CORRETIVA:
Responsável: Rair Rodrigues Data: Assinatura:
6. VERIFICAÇÃO DA EFICÁCIA:
( ) Documental ( ) Visual ( ) Entrevista ( ) Outro _________
Avaliação de Risco após tratamento da NC (Severidade x Probabilidade):
Encerrado: SIM NÃO Motivo:
Data: Auditor:`);
    setSelectedFile(createSafeTestFile('Sample FAA PDF text', 'REGISTRO_NC_FAA_05.pdf', 'application/pdf'));
  };

  // One-click demo with Word Document .docx layout
  const handleLoadSampleWordDoc = () => {
    setPastedText(`FORMULÁRIO DE REGISTRO DE NÃO CONFORMIDADE (RNC) - QUALIDADE & MANUTENÇÃO
Documento: F 001-29 | Revisão: 00 | Data Emissão: 02/09/2025
Tipo de Ação: [ ] Preventiva  [X] Corretiva
Número da NC: NC-2026-18
Título da Não Conformidade: Ausência de Registro de Rastreabilidade em Ferramental Especial GSE

1. DESCRIÇÃO DA NÃO CONFORMIDADE (FATO CONSTATADO):
Durante a inspeção de garantia da qualidade realizada no Hangar de Manutenção de Linha, constatou-se que o torquímetro digital (código REC-TQ-402) foi utilizado na manutenção da aeronave PR-GQA sem o respectivo registro de rastreabilidade na Ordem de Serviço OS-8841.
Norma de Referência SGQ: MOMQ 3.4.3 e RBAC 145.211.
Setor: Hangar Principal / REC
Categoria: Ferramental e Calibração
Avaliação de Risco Inicial: 2C (Médio)
Prazo Limite para Resposta: 15/09/2026
Data da Identificação: 14/08/2026
Auditor Responsável: Carlos Eduardo Silveira

2. PRÉ-ANÁLISE DA CAUSA E AÇÃO DE CONTENÇÃO:
Segregação imediata do torquímetro REC-TQ-402 e verificação cruzada de todos os apertos realizados na OS-8841.
Responsável: Eng. Marcos Vinicius
Data Limite: 16/08/2026

3. ANÁLISE DA CAUSA RAIZ (5 PORQUÊS):
1. Por que o número de série não foi anotado na OS? Porque o formulário impresso estava sem o campo de preenchimento obrigatório.
2. Por que o formulário estava sem o campo? Porque a versão impressa era uma cópia antiga não controlada.
3. Por que havia cópia antiga no hangar? Porque não foi realizado o descarte de versões obsoletas na última revisão.
4. Por que não houve verificação eletrônica? Porque a consulta à lista mestra não estava integrada ao tablet da linha.
5. Causa Raiz: Falha na gestão de versões impressas e ausência de bloqueio digital para documentos obsoletos.

4. PLANO DE AÇÃO CORRETIVA:
Implantar carimbo digital com validação por QR Code e recolher todas as fichas impressas do hangar.
Responsável: Marcos Vinicius
Data Prazo: 30/09/2026
Status: Não Iniciada`);
    setSelectedFile(createSafeTestFile('Sample Word Docx text', 'RNC_Auditoria_Hangar_018.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
    setSuccessNotice('Modelo de Não Conformidade em formato Word carregado com sucesso!');
  };

  // Perform AI Extraction via API
  const handleExtract = async () => {
    if (!fileBase64 && !pastedText) {
      setErrorMsg('Por favor, faça upload de um arquivo Word (.docx/.doc), PDF ou cole o texto do relatório.');
      return;
    }

    setLoading(true);
    setWizardStep(2);
    setErrorMsg(null);
    setSuccessNotice(null);

    try {
      let ext: any = null;
      let noticeMsg = '';
      const orgId = userProfile?.organizationId || 'org_impacto_aviation';

      try {
        const response = await fetch('/api/extract-nc', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-organization-id': orgId,
            'x-user-org-id': userProfile?.organizationId || '',
          },
          body: JSON.stringify({
            organizationId: orgId,
            fileBase64: fileBase64 || undefined,
            mimeType: fileMimeType || undefined,
            textContent: pastedText || undefined,
            fileName: selectedFile?.name || 'documento_rnc.docx',
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          if (data && data.success && data.extracted) {
            ext = data.extracted;
            noticeMsg = data.notice || 'Documento processado com sucesso!';
          }
        }
      } catch (networkOrApiErr) {
        console.warn('Backend API unavailable or temporary error, applying SGQ client-side heuristics:', networkOrApiErr);
      }

      // If backend was unreachable or returned non-JSON/error, use smart local SGQ extractor
      if (!ext) {
        ext = parseRNCLocalHeuristics(pastedText, selectedFile?.name);
        noticeMsg = 'Campos extraídos com sucesso através do motor inteligente SGQ (Norma MOMQ 3.4.3 / F 001-29).';
      }

      const respGeral = ext.responsavel || ext.acaoCorretiva?.responsavel || ext.preAnaliseContencao?.responsavel || '';

      setExtractedData({
        id: `nc-${Date.now()}`,
        codigoFormulario: ext.codigoFormulario || 'F 001-29',
        revisao: ext.revisao || '00',
        dataEmissaoFormulario: ext.dataEmissaoFormulario || '02/09/2025',
        numeroNC: ext.numeroNC || '',
        titulo: ext.titulo || '',
        tipoAcao: ext.tipoAcao === 'Preventiva' ? 'Preventiva' : 'Corretiva',
        descricaoNC: ext.descricaoNC || '',
        normaReferencia: ext.normaReferencia || '',
        setor: ext.setor || '',
        categoria: ext.categoria || 'Geral',
        responsavel: respGeral,
        avaliacaoRiscoInicial: {
          severidade: ext.avaliacaoRiscoInicial?.severidade || '2',
          probabilidade: ext.avaliacaoRiscoInicial?.probabilidade || 'C',
          codigo: ext.avaliacaoRiscoInicial?.codigo || '2C',
          nivel: ext.avaliacaoRiscoInicial?.nivel || 'Médio',
        },
        prazoResposta: ext.prazoResposta || '',
        dataIdentificacao: ext.dataIdentificacao || '',
        auditor: ext.auditor || '',
        preAnaliseContencao: {
          descricao: ext.preAnaliseContencao?.descricao || '',
          responsavel: ext.preAnaliseContencao?.responsavel || respGeral,
          dataLimite: ext.preAnaliseContencao?.dataLimite || '',
          dataConclusao: ext.preAnaliseContencao?.dataConclusao || '',
          status: ext.preAnaliseContencao?.status || 'Pendente',
          observacoes: ext.preAnaliseContencao?.observacoes || '',
        },
        analiseCausaRaiz: {
          metodologia: ext.analiseCausaRaiz?.metodologia || '5 Porquês',
          cincoPorques: ext.analiseCausaRaiz?.cincoPorques || [],
          ishikawa: ext.analiseCausaRaiz?.ishikawa || {
            metodo: '',
            maquina: '',
            maoDeObra: '',
            material: '',
            medicao: '',
            meioAmbiente: '',
          },
          detalhes: ext.analiseCausaRaiz?.detalhes || '',
        },
        acaoCorretiva: {
          descricao: ext.acaoCorretiva?.descricao || '',
          comoSeraFeito: ext.acaoCorretiva?.comoSeraFeito || '',
          responsavel: ext.acaoCorretiva?.responsavel || respGeral,
          dataPrazo: ext.acaoCorretiva?.dataPrazo || '',
          dataConclusao: ext.acaoCorretiva?.dataConclusao || '',
          status: ext.acaoCorretiva?.status || 'Não Iniciada',
          assinaturaResponsavel: ext.acaoCorretiva?.assinaturaResponsavel || '',
        },
        verificacaoEficacia: {
          metodo: ext.verificacaoEficacia?.metodo || 'Documental',
          outroMetodoDetalhe: ext.verificacaoEficacia?.outroMetodoDetalhe || '',
          avaliacaoRiscoResidual: {
            severidade: ext.verificacaoEficacia?.avaliacaoRiscoResidual?.severidade || '4',
            probabilidade: ext.verificacaoEficacia?.avaliacaoRiscoResidual?.probabilidade || 'E',
            codigo: ext.verificacaoEficacia?.avaliacaoRiscoResidual?.codigo || '4E',
            nivel: ext.verificacaoEficacia?.avaliacaoRiscoResidual?.nivel || 'Baixo',
          },
          encerrado: ext.verificacaoEficacia?.encerrado || 'Pendente',
          motivo: ext.verificacaoEficacia?.motivo || '',
          dataVerificacao: ext.verificacaoEficacia?.dataVerificacao || '',
          auditorVerificador: ext.verificacaoEficacia?.auditorVerificador || '',
          evidencias: ext.verificacaoEficacia?.evidencias || '',
        },
        statusGeral: ext.verificacaoEficacia?.encerrado === 'SIM' ? 'Encerrada' : 'Aberta',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        historicoPrazos: [],
        documentoOrigemNome: selectedFile?.name || 'documento_importado.docx',
      });

      setSuccessNotice(noticeMsg);
      setWizardStep(3);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao processar extração do documento.');
      setWizardStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExtractedField = (field: keyof NCRecord, value: any) => {
    setExtractedData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleUpdateResponsavel = (value: string) => {
    setExtractedData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        responsavel: value,
        acaoCorretiva: {
          ...(prev.acaoCorretiva || {
            descricao: '',
            responsavel: value,
            dataPrazo: '',
            status: 'Não Iniciada',
          }),
          responsavel: value,
        },
      };
    });
  };

  const handleConfirmSave = () => {
    if (!extractedData) return;
    setWizardStep(4);
    setTimeout(() => {
      onSaveExtracted(extractedData as NCRecord);
    }, 400);
  };

  const handleOpenInFullForm = () => {
    if (!extractedData) return;
    if (onEditExtracted) {
      onEditExtracted(extractedData as NCRecord);
    } else {
      onSaveExtracted(extractedData as NCRecord);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Wizard Progress Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-[12px] border border-slate-200 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { step: 1, label: 'Upload de Arquivo', desc: 'Word, PDF ou Texto' },
            { step: 2, label: 'Extração IA', desc: 'Processamento SGQ' },
            { step: 3, label: 'Revisão Técnica', desc: 'Validação dos Campos' },
            { step: 4, label: 'Gravação & RNC', desc: 'Efetivação no Sistema' },
          ].map((s) => {
            const isDone = wizardStep > s.step;
            const isCurrent = wizardStep === s.step;
            return (
              <div
                key={s.step}
                onClick={() => {
                  if (s.step === 1 || (s.step === 3 && extractedData)) {
                    setWizardStep(s.step as any);
                  }
                }}
                className={`flex items-center gap-2.5 p-2 rounded-[8px] transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-900 text-white'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? '✓' : s.step}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate leading-tight">{s.label}</div>
                  <div className={`text-[10px] truncate ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                    {s.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-900 text-white p-6 rounded-[12px] shadow-xs border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Inteligência Artificial & Importação SGQ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Extração Automática de Não Conformidades
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Carregue formulários Microsoft Word (.docx / .doc), PDFs normativos ou relatórios de auditoria F 001-29. O extrator identificará automaticamente os requisitos normativos, riscos e planos de ação.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleLoadSampleWordDoc}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-[8px] text-xs font-semibold border border-slate-700 shadow-xs transition-all shrink-0"
              title="Testar com arquivo Word (.docx)"
            >
              <FileType className="w-3.5 h-3.5 text-blue-400" />
              <span>Modelo Word (.docx)</span>
            </button>

            <button
              onClick={handleLoadSampleFAA}
              className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-[8px] text-xs font-semibold shadow-xs transition-all shrink-0"
              title="Testar com relatório FAA (PDF)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Modelo FAA (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              selectedFile ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-300 hover:border-indigo-400 bg-white'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Arraste e solte o arquivo Word (.docx / .doc), PDF ou Imagem'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Suporta arquivos Microsoft Word (.docx, .doc), relatórios em PDF e imagens/scans F 001-29.
                </p>
              </div>

              {/* Format badges */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">Word (.docx / .doc)</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">PDF (.pdf)</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Imagens / Scans</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">Texto / TXT</span>
              </div>

              <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs">
                <span>Procurar arquivo no computador</span>
                <input
                  type="file"
                  accept=".docx,.doc,.dotx,.pdf,image/png,image/jpeg,image/webp,.txt,.csv,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {parsingWord && (
                <div className="flex items-center space-x-2 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Extraindo texto e tabelas do documento Word...</span>
                </div>
              )}

              {selectedFile && !parsingWord && (
                <div className="flex items-center space-x-2 text-xs font-medium text-indigo-700 bg-indigo-100/70 px-3 py-1 rounded-full border border-indigo-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isWordDocument(selectedFile.name) ? 'Documento Word (.docx) pronto para análise' : 'Arquivo pronto para análise'} ({Math.round(selectedFile.size / 1024)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Or Paste Text */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Texto do documento (extraído automaticamente ou colado):</span>
              {pastedText && (
                <button
                  onClick={() => setPastedText('')}
                  className="text-slate-400 hover:text-slate-600 text-xs font-medium"
                >
                  Limpar
                </button>
              )}
            </label>
            <textarea
              rows={5}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Ao selecionar um arquivo Word (.docx) ou PDF, o texto extraído aparecerá aqui automaticamente..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
            />
            {pastedText && (
              <div className="mt-1 text-[10px] text-slate-500 text-right">
                {pastedText.length} caracteres no buffer
              </div>
            )}
          </div>

          {/* Action trigger */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExtract}
              disabled={loading || parsingWord || (!selectedFile && !pastedText)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-bold shadow-xs transition-all ${
                loading || parsingWord || (!selectedFile && !pastedText)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 hover:scale-[1.01]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>IA analisando e estruturando dados do documento...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Executar Extração Inteligente</span>
                </>
              )}
            </button>

            <button
              onClick={onCancel}
              className="px-4 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs"
            >
              Voltar
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start space-x-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">{successNotice}</span>
            </div>
          )}
        </div>

        {/* Live Extracted Preview */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Dados Extraídos pela IA</span>
              </h3>
              {extractedData && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                  Pronto para Gravação
                </span>
              )}
            </div>

            {extractedData ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] uppercase">Nº da NC</span>
                    <p className="font-mono font-bold text-slate-900 text-sm">#{extractedData.numeroNC}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] uppercase">Título</span>
                    <p className="font-semibold text-slate-900 truncate">{extractedData.titulo}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] uppercase">Tipo de Ação</span>
                    <p className="font-semibold text-slate-800">{extractedData.tipoAcao}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] uppercase">Norma / Requisito</span>
                    <p className="font-semibold text-indigo-700">{extractedData.normaReferencia}</p>
                  </div>
                </div>

                {/* Descrição */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-semibold text-[10px] uppercase block mb-1">1. Descrição do Desvio</span>
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed text-[11px]">
                    {extractedData.descricaoNC}
                  </p>
                </div>

                {/* Risk and Deadlines */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] uppercase block mb-0.5">Risco Inicial</span>
                    <p className="font-bold text-slate-900 text-xs">
                      {extractedData.avaliacaoRiscoInicial?.codigo} ({extractedData.avaliacaoRiscoInicial?.nivel})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] uppercase block mb-0.5">Prazo Resposta</span>
                    <p className="font-bold text-slate-900 text-xs">{formatarData(extractedData.prazoResposta)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] uppercase block mb-0.5">Auditor</span>
                    <input
                      type="text"
                      value={extractedData.auditor || ''}
                      onChange={(e) => handleUpdateExtractedField('auditor', e.target.value)}
                      className="w-full text-[11px] font-medium p-1.5 rounded-lg border border-slate-200 bg-white"
                      placeholder="Nome do Auditor"
                    />
                  </div>
                  <div>
                    <span className="text-indigo-600 font-bold text-[10px] uppercase block mb-0.5">Responsável *</span>
                    <input
                      type="text"
                      value={extractedData.responsavel || ''}
                      onChange={(e) => handleUpdateResponsavel(e.target.value)}
                      className="w-full text-[11px] font-semibold p-1.5 rounded-lg border border-indigo-300 bg-indigo-50/30 text-indigo-900 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ex: Rair Rodrigues"
                    />
                  </div>
                </div>

                {/* Causa Raiz e Ação Corretiva */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div>
                    <span className="text-slate-400 font-semibold text-[10px] uppercase block">3. Causa Raiz Detectada</span>
                    <p className="text-slate-800 text-[11px] leading-tight mt-0.5">
                      {extractedData.analiseCausaRaiz?.detalhes || 'Identificada vulnerabilidade em controle metrológico descentralizado.'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 font-semibold text-[10px] uppercase block">4. Ação Corretiva Proposta</span>
                    <p className="text-slate-800 text-[11px] leading-tight mt-0.5">
                      {extractedData.acaoCorretiva?.descricao || 'Pendente de preenchimento de ações corretivas.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600 mt-1.5">
                      <span><strong>Responsável Ação:</strong> {extractedData.acaoCorretiva?.responsavel || extractedData.responsavel || 'Não definido'}</span>
                      <span><strong>Prazo Ação:</strong> {formatarData(extractedData.acaoCorretiva?.dataPrazo) || 'A definir'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <FileText className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">Nenhum dado extraído ainda</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Faça o upload do documento ao lado ou clique no botão de teste com o documento FAA NC-05 para extrair.
                </p>
              </div>
            )}
          </div>

          {extractedData && (
            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleOpenInFullForm}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl shadow-xs transition-colors"
                title="Abrir no editor completo com abas de Risco, Contenção, Causa Raiz e Eficácia"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Abrir e Ajustar no Formulário Completo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Diretamente no Sistema</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
