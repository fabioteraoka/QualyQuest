import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Scale,
  RefreshCw,
  Save,
  BookOpen,
  Send,
  Database,
  Eye,
  AlertOctagon,
  ChevronRight,
  Info,
  Sliders,
  Check,
  Edit3,
  Layers,
} from 'lucide-react';
import {
  NCRecord,
  ComparacaoRNCRecord,
  ItemComparacaoCampo,
  ClassificacaoDiferenca,
  DecisaoPrevalencia,
  DecisaoValidacaoCampo,
  UserProfile,
  ManualRecord,
  CorrespondenciaRNC,
} from '../types';
import { identifyMatchingRNC } from '../utils/rncMatcher';
import { compareRNCWithRespondedDocument } from '../utils/semanticComparison';
import { extractTextFromWordFile, isWordDocument } from '../utils/wordExtractor';
import { saveRNCComparison, saveValidatedKnowledge, saveNCRecord } from '../services/firebase/firestore';

interface RNCComparisonViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  records: NCRecord[];
  manuals: ManualRecord[];
  onSelectRecord?: (record: NCRecord) => void;
  onNavigateToTab?: (tabId: string) => void;
}

export const RNCComparisonView: React.FC<RNCComparisonViewProps> = ({
  organizationId,
  userProfile,
  records,
  manuals,
  onSelectRecord,
  onNavigateToTab,
}) => {
  // Passos do Fluxo: 1: Upload, 2: Identificação/Associação, 3: Comparação Semântica & Decisões, 4: Conclusão & Aplicação
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Estados de Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados de Associação / Matching
  const [correspondencia, setCorrespondencia] = useState<CorrespondenciaRNC | null>(null);
  const [selectedRNCId, setSelectedRNCId] = useState<string>('');
  const [manualConfirmJustification, setManualConfirmJustification] = useState<string>('');

  // Estados de Comparação
  const [comparisonResult, setComparisonResult] = useState<ComparacaoRNCRecord | null>(null);
  const [campoDecisoes, setCampoDecisoes] = useState<Record<string, DecisaoValidacaoCampo>>({});
  const [auditorNotes, setAuditorNotes] = useState<string>('');
  const [isApplyingToNC, setIsApplyingToNC] = useState<boolean>(false);
  const [isPromotingKnowledge, setIsPromotingKnowledge] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manipulador de Upload de Arquivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setErrorMsg(null);
    setIsExtracting(true);

    try {
      let extractedPlain = '';

      // 1. Extração no cliente imediata para arquivos Word (.docx/.doc) ou texto (.txt)
      if (isWordDocument(file.name, file.type)) {
        try {
          extractedPlain = await extractTextFromWordFile(file);
        } catch (docxErr) {
          console.warn('Tentativa de extração docx local:', docxErr);
        }
      } else if (file.name.endsWith('.txt') || file.type.includes('text/plain')) {
        try {
          extractedPlain = await file.text();
        } catch (txtErr) {
          console.warn('Tentativa de leitura de texto:', txtErr);
        }
      }

      // 2. Se necessário, enviar ao backend para extração complementar (ex: PDF ou enriquecimento)
      let base64Data = '';
      if (!extractedPlain || extractedPlain.length < 30) {
        try {
          base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });

          if (base64Data) {
            const response = await fetch('/api/extract-document-text', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-organization-id': organizationId,
                'x-user-org-id': userProfile?.organizationId || '',
              },
              body: JSON.stringify({
                organizationId,
                fileBase64: base64Data,
                mimeType: file.type,
                fileName: file.name,
                textContent: extractedPlain || undefined,
              }),
            });

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await response.json();
              if (data && data.success) {
                extractedPlain = data.textoExtraidoBruto || data.textoFormatado || extractedPlain;
              }
            }
          }
        } catch (apiErr) {
          console.warn('API de extração do backend não retornou JSON ou falhou, mantendo texto local:', apiErr);
        }
      }

      const text = extractedPlain?.trim() || '';
      if (!text || text.length < 15) {
        throw new Error('Não foi possível extrair texto do documento fornecido. Verifique se o arquivo não está vazio ou protegido.');
      }

      setExtractedText(text);

      // Executar identificação preliminar da RNC correspondente
      const match = identifyMatchingRNC(text, file.name, records);
      setCorrespondencia(match);
      if (match.rncId) {
        setSelectedRNCId(match.rncId);
      }
      setStep(2);
    } catch (err: any) {
      console.error('Erro na extração do arquivo:', err);
      setErrorMsg(`Erro ao processar o documento: ${err.message}. Você pode tentar colar o texto manualmente.`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Manipulador de Texto Colado Manualmente
  const handlePastedTextSubmit = () => {
    if (!pastedText.trim() || pastedText.trim().length < 20) {
      setErrorMsg('Por favor insira um texto com ao menos 20 caracteres para comparação.');
      return;
    }
    setErrorMsg(null);
    setExtractedText(pastedText);
    const match = identifyMatchingRNC(pastedText, 'texto_colado_resposta.txt', records);
    setCorrespondencia(match);
    if (match.rncId) {
      setSelectedRNCId(match.rncId);
    }
    setStep(2);
  };

  // Executar a Comparação Semântica Detalhada
  const handleExecuteComparison = async () => {
    const targetRNC = records.find((r) => r.id === selectedRNCId);
    if (!targetRNC) {
      setErrorMsg('Selecione uma Não Conformidade válida para associar e comparar.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      let data: any = null;

      try {
        const res = await fetch('/api/compare-rnc', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-organization-id': organizationId,
            'x-user-org-id': userProfile?.organizationId || '',
          },
          body: JSON.stringify({
            organizationId,
            rncOriginal: targetRNC,
            textoDocumentoResposta: extractedText,
            nomeArquivo: uploadedFile?.name || 'resposta_colada.txt',
            tipoArquivo: uploadedFile ? (uploadedFile.name.endsWith('.docx') ? 'DOCX' : uploadedFile.name.endsWith('.pdf') ? 'PDF' : 'TXT') : 'TEXTO_COLADO',
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json();
        }
      } catch (networkOrApiErr) {
        console.warn('API /api/compare-rnc indisponível ou erro temporário, aplicando motor SGQ cliente:', networkOrApiErr);
      }

      let compRecord: ComparacaoRNCRecord;

      if (data && data.success && data.camposComparados) {
        const now = new Date().toISOString();
        compRecord = {
          id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          documentoFonteId: `doc_${Date.now()}`,
          nomeArquivoFonte: uploadedFile?.name || 'resposta_usuario.txt',
          tipoArquivoFonte: uploadedFile ? (uploadedFile.name.endsWith('.docx') ? 'DOCX' : uploadedFile.name.endsWith('.pdf') ? 'PDF' : 'TXT') : 'TEXTO_COLADO',
          textoOriginalExtraido: extractedText,
          tamanhoArquivo: uploadedFile?.size,
          dataUpload: now,
          rncIdAssociada: targetRNC.id,
          numeroNCAssociada: targetRNC.numeroNC,
          correspondencia: {
            ...correspondencia!,
            rncId: targetRNC.id,
            numeroNC: targetRNC.numeroNC,
            tituloNC: targetRNC.titulo,
            confianca: correspondencia?.rncId === targetRNC.id ? correspondencia.confianca : 100,
            nivelConfianca: correspondencia?.rncId === targetRNC.id ? correspondencia.nivelConfianca : 'ALTA',
            metodoIdentificacao: correspondencia?.rncId === targetRNC.id ? correspondencia.metodoIdentificacao : 'MANUAL_USUARIO',
            confirmadoManualmente: correspondencia?.rncId !== targetRNC.id || !!manualConfirmJustification,
            justificativaConfirmacao: manualConfirmJustification,
          },
          statusGeral: 'PENDENTE_VALIDACAO',
          camposComparados: data.camposComparados,
          resumoComparacao: data.resumo || {
            totalCampos: data.camposComparados.length,
            convergentes: data.camposComparados.filter((c: any) => c.classificacao === 'CONVERGENTE').length,
            complementares: data.camposComparados.filter((c: any) => c.classificacao === 'COMPLEMENTAR').length,
            divergentes: data.camposComparados.filter((c: any) => c.classificacao === 'DIVERGENTE').length,
            contraditorios: data.camposComparados.filter((c: any) => c.classificacao === 'CONTRADITORIO').length,
            novasInformacoes: data.camposComparados.filter((c: any) => c.classificacao === 'NOVA_INFORMACAO').length,
            naoInformados: data.camposComparados.filter((c: any) => c.classificacao === 'NAO_INFORMADO').length,
            taxaConcordancia: 80,
            principaisDivergencias: [],
            principaisComplementos: [],
          },
          propostaAtualizacaoRNC: {
            descricaoNC: data.camposComparados.find((c: any) => c.campoId === 'descricao')?.valorRespostaUsuario,
            normaReferencia: data.camposComparados.find((c: any) => c.campoId === 'normaReferencia')?.valorRespostaUsuario,
            preAnaliseContencao: {
              descricao: data.camposComparados.find((c: any) => c.campoId === 'contencao')?.valorRespostaUsuario || '',
            },
            analiseCausaRaiz: {
              detalhes: data.camposComparados.find((c: any) => c.campoId === 'causaRaiz')?.valorRespostaUsuario || '',
            },
            acaoCorretiva: {
              descricao: data.camposComparados.find((c: any) => c.campoId === 'acaoCorretiva')?.valorRespostaUsuario || '',
            },
          },
          historicoDecisoes: [],
          criadoEm: now,
          atualizadoEm: now,
        };
      } else {
        // Fallback para gerador semântico cliente
        compRecord = compareRNCWithRespondedDocument(
          targetRNC,
          {},
          {
            documentoFonteId: `doc_${Date.now()}`,
            nomeArquivoFonte: uploadedFile?.name || 'resposta_usuario.txt',
            tipoArquivoFonte: uploadedFile ? 'DOCX' : 'TEXTO_COLADO',
            textoOriginalExtraido: extractedText,
            tamanhoArquivo: uploadedFile?.size,
            correspondencia: correspondencia!,
          }
        );
      }

      // Inicializar decisões padrão: A RESPOSTA REAL DO USUÁRIO PREVALECE POR PADRÃO
      const initialDecisions: Record<string, DecisaoValidacaoCampo> = {};
      for (const campo of compRecord.camposComparados) {
        initialDecisions[campo.campoId] = {
          campoId: campo.campoId,
          decisao: campo.classificacao === 'NAO_INFORMADO' ? 'MANTER_ORIGINAL' : 'ACEITAR_RESPOSTA_USUARIO',
          valorFinalAprovado: campo.classificacao === 'NAO_INFORMADO' ? campo.valorOriginalQualiGest : campo.valorRespostaUsuario,
          justificativa: 'Validação em conformidade com o princípio de prevalência da resposta real do usuário.',
        };
      }
      setCampoDecisoes(initialDecisions);
      setComparisonResult(compRecord);
      setStep(3);
    } catch (err: any) {
      console.error('Erro na comparação semântica:', err);
      setErrorMsg(`Erro ao processar a comparação: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Alterar decisão de um campo
  const handleDecisionChange = (campoId: string, decisao: DecisaoPrevalencia, valorCustom?: string) => {
    if (!comparisonResult) return;
    const campo = comparisonResult.camposComparados.find((c) => c.campoId === campoId);
    if (!campo) return;

    let valorFinal = campo.valorRespostaUsuario;
    if (decisao === 'MANTER_ORIGINAL') valorFinal = campo.valorOriginalQualiGest;
    else if (decisao === 'MESCLAR_AMBOS') valorFinal = `${campo.valorOriginalQualiGest}\n\n[COMPLEMENTO DO RESPONSÁVEL]:\n${campo.valorRespostaUsuario}`;
    else if (decisao === 'EDITAR_MANUALMENTE' && valorCustom !== undefined) valorFinal = valorCustom;

    setCampoDecisoes((prev) => ({
      ...prev,
      [campoId]: {
        campoId,
        decisao,
        valorFinalAprovado: valorFinal,
        justificativa: `Decisão de validação: ${decisao}`,
      },
    }));
  };

  // Salvar a Análise no Firestore sem alterar a RNC original
  const handleSaveAnalysisOnly = async () => {
    if (!comparisonResult) return;
    try {
      const now = new Date().toISOString();
      const updatedRecord: ComparacaoRNCRecord = {
        ...comparisonResult,
        statusGeral: 'VALIDADO_COM_DIVERGENCIAS',
        auditorAprovadorEmail: userProfile?.email || 'auditor@sgq.local',
        auditorAprovadorUid: userProfile?.uid || 'anon',
        dataValidacaoAuditor: now,
        parecerAuditorSGQ: auditorNotes,
        historicoDecisoes: Object.values(campoDecisoes || {}),
        atualizadoEm: now,
      };

      await saveRNCComparison(organizationId, updatedRecord, userProfile);
      setSuccessMsg('Análise de comparação salva com sucesso no histórico do SGQ!');
      setStep(4);
    } catch (err: any) {
      setErrorMsg(`Erro ao salvar análise: ${err.message}`);
    }
  };

  // Aplicar as alterações validadas na RNC Oficial do QualiGest
  const handleApplyToOfficialRNC = async () => {
    if (!comparisonResult || !selectedRNCId) return;
    setIsApplyingToNC(true);
    setErrorMsg(null);

    try {
      const targetRNC = records.find((r) => r.id === selectedRNCId);
      if (!targetRNC) throw new Error('RNC alvo não localizada no cadastro.');

      const now = new Date().toISOString();

      // Montar novo registro de RNC com preservação dos dados anteriores no histórico
      const updatedNC: NCRecord = {
        ...targetRNC,
        descricaoNC: campoDecisoes['descricao']?.valorFinalAprovado || targetRNC.descricaoNC,
        normaReferencia: campoDecisoes['normaReferencia']?.valorFinalAprovado || targetRNC.normaReferencia,
        preAnaliseContencao: {
          descricao: campoDecisoes['contencao']?.valorFinalAprovado || targetRNC.preAnaliseContencao?.descricao || '',
          dataPrazo: targetRNC.preAnaliseContencao?.dataPrazo,
          responsavel: targetRNC.preAnaliseContencao?.responsavel,
          status: 'Concluída',
        },
        analiseCausaRaiz: {
          ...targetRNC.analiseCausaRaiz,
          detalhes: campoDecisoes['causaRaiz']?.valorFinalAprovado || targetRNC.analiseCausaRaiz?.detalhes || '',
        },
        acaoCorretiva: {
          ...targetRNC.acaoCorretiva,
          descricao: campoDecisoes['acaoCorretiva']?.valorFinalAprovado || targetRNC.acaoCorretiva?.descricao || '',
          comoSeraFeito: targetRNC.acaoCorretiva?.comoSeraFeito,
          responsavel: targetRNC.acaoCorretiva?.responsavel,
        },
        verificacaoEficacia: {
          ...targetRNC.verificacaoEficacia,
          motivo: campoDecisoes['verificacaoEficacia']?.valorFinalAprovado || targetRNC.verificacaoEficacia?.motivo || '',
        },
        statusGeral: 'Em Análise de Eficácia',
        historicoRevisoes: [
          ...(targetRNC.historicoRevisoes || []),
          {
            versao: ((targetRNC.historicoRevisoes?.length || 0) + 1).toString(),
            dataAlteracao: now,
            autorAlteracao: userProfile?.displayName || userProfile?.email || 'Auditor SGQ',
            motivo: `Atualização oficial via validação de documento respondido (${comparisonResult.nomeArquivoFonte}). Prevalência da resposta real do usuário aplicada.`,
          },
        ],
        atualizadoEm: now,
      };

      // 1. Salvar RNC atualizada
      await saveNCRecord(organizationId, updatedNC, userProfile);

      // 2. Atualizar registro de comparação para status APLICADO_NA_RNC
      const updatedComp: ComparacaoRNCRecord = {
        ...comparisonResult,
        statusGeral: 'APLICADO_NA_RNC',
        auditorAprovadorEmail: userProfile?.email || 'auditor@sgq.local',
        auditorAprovadorUid: userProfile?.uid || 'anon',
        dataValidacaoAuditor: now,
        parecerAuditorSGQ: auditorNotes || 'Validação formal aprovada e aplicada na RNC oficial.',
        historicoDecisoes: Object.values(campoDecisoes || {}),
        atualizadoEm: now,
      };
      await saveRNCComparison(organizationId, updatedComp, userProfile);

      setSuccessMsg(`RNC ${targetRNC.numeroNC} atualizada com sucesso com base nas respostas validadas do usuário!`);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(`Erro ao aplicar na RNC: ${err.message}`);
    } finally {
      setIsApplyingToNC(false);
    }
  };

  // Promover a Padrão da Base de Conhecimento SGQ
  const handlePromoteToKnowledgeBase = async () => {
    if (!comparisonResult) return;
    setIsPromotingKnowledge(true);
    setErrorMsg(null);

    try {
      const targetRNC = records.find((r) => r.id === selectedRNCId);
      const causaFinal = campoDecisoes['causaRaiz']?.valorFinalAprovado || comparisonResult.propostaAtualizacaoRNC?.analiseCausaRaiz?.detalhes || 'Causa raiz validada em campo';
      const acaoFinal = campoDecisoes['acaoCorretiva']?.valorFinalAprovado || comparisonResult.propostaAtualizacaoRNC?.acaoCorretiva?.descricao || 'Plano de ação validado';
      const contencaoFinal = campoDecisoes['contencao']?.valorFinalAprovado || comparisonResult.propostaAtualizacaoRNC?.preAnaliseContencao?.descricao || 'Contenção imediata';

      const now = new Date().toISOString();
      const knowledgeId = `know_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await saveValidatedKnowledge(
        organizationId,
        {
          id: knowledgeId,
          tituloPadrao: `Padrão SGQ: ${targetRNC?.categoria || 'Operacional'} - ${targetRNC?.setor || 'Geral'}`,
          categoria: targetRNC?.categoria || 'Calibração e Metrologia',
          setor: targetRNC?.setor || 'REC / Manutenção',
          contextoDesvio: targetRNC?.descricaoNC || 'Desvio identificado em auditoria de qualidade',
          causaValidada: causaFinal,
          acoesCorretivasRecomendadas: [acaoFinal],
          contencoesRecomendadas: [contencaoFinal],
          normasAplicaveis: [targetRNC?.normaReferencia || 'MOMQ'],
          rncsOrigemNumeros: [targetRNC?.numeroNC || comparisonResult.numeroNCAssociada || 'NC-001'],
          frequenciaObservada: 1,
          nivelMaturidade: 2, // Nível 2: Padrão Emergente
          status: 'VALIDADO',
          validadoPorGestor: userProfile?.displayName || userProfile?.email || 'Gestor SGQ',
          dataValidacao: now.split('T')[0],
          justificativaSGQ: `Padrão derivado da validação da resposta da RNC ${targetRNC?.numeroNC} (${comparisonResult.nomeArquivoFonte}).`,
          criadoEm: now,
          atualizadoEm: now,
        },
        userProfile
      );

      // Atualizar status da comparação
      await saveRNCComparison(
        organizationId,
        {
          ...comparisonResult,
          statusGeral: 'PROMOVIDO_A_PADRAO',
          atualizadoEm: now,
        },
        userProfile
      );

      setSuccessMsg('Padrão registrado com sucesso na Base de Conhecimento Validada do SGQ (Nível 2)!');
      setStep(4);
    } catch (err: any) {
      setErrorMsg(`Erro ao promover conhecimento: ${err.message}`);
    } finally {
      setIsPromotingKnowledge(false);
    }
  };

  // Helper para Badge de Classificação de Diferença
  const renderClassificationBadge = (classificacao: ClassificacaoDiferenca) => {
    switch (classificacao) {
      case 'CONVERGENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Convergente
          </span>
        );
      case 'COMPLEMENTAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            Complementar (+ Detalhes)
          </span>
        );
      case 'DIVERGENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
            <Scale className="w-3.5 h-3.5 text-orange-600" />
            Divergente (Prevalece Usuário)
          </span>
        );
      case 'CONTRADITORIO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            Contraditório
          </span>
        );
      case 'NOVA_INFORMACAO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Nova Informação
          </span>
        );
      case 'NAO_INFORMADO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Não Informado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Institucional do Módulo */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                FASE 3 — APRENDIZADO & VALIDAÇÃO
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                A RESPOSTA REAL PREVALECE
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Validação & Comparação de RNCs Respondidas
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Compare as análises preliminares e hipóteses da IA com os documentos oficiais respondidos pelos executantes e auditores. Identifique divergências, aprove prevalências e forme padrões para a base de conhecimento do SGQ.
            </p>
          </div>

          {/* Stepper Visual */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 p-2 rounded-lg border border-slate-200">
            <button
              onClick={() => setStep(1)}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                step === 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> 1. Upload
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => extractedText && setStep(2)}
              disabled={!extractedText}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                step === 2 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> 2. RNC Alvo
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => comparisonResult && setStep(3)}
              disabled={!comparisonResult}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${
                step === 3 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
              }`}
            >
              <Scale className="w-3.5 h-3.5" /> 3. Comparação & Decisão
            </button>
          </div>
        </div>
      </div>

      {/* Alertas de Erro / Sucesso */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Atenção na Operação</p>
            <p>{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 text-xs">
            Fechar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Sucesso!</p>
            <p>{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 text-xs">
            Fechar
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASSO 1: UPLOAD DO DOCUMENTO DE RESPOSTA OU TEXTO COLADO */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card A: Upload de Arquivo Oficial (DOCX, PDF, TXT) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  1A
                </div>
                <h2 className="text-lg font-bold text-slate-900">Upload de Arquivo Respondido</h2>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Envie o formulário oficial preenchido pelos técnicos, inspetores ou auditores nos formatos <strong>DOCX</strong>, <strong>PDF</strong> ou <strong>TXT</strong>.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isExtracting ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".docx,.doc,.pdf,.txt"
                  className="hidden"
                />
                {isExtracting ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="font-semibold text-slate-900 text-sm">Extraindo conteúdo do documento...</p>
                    <p className="text-xs text-slate-500">Decodificando tabelas, 5W2H e campos do SGQ.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        Clique para selecionar ou arraste o arquivo aqui
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Formatos suportados: DOCX (Recomendado F 001-29), PDF, TXT (até 25MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>O sistema preserva a formatação e busca automaticamente o número da NC e causas declaradas.</span>
            </div>
          </div>

          {/* Card B: Colar Texto da Resposta Diretamente */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  1B
                </div>
                <h2 className="text-lg font-bold text-slate-900">Colar Texto da Resposta</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Caso prefira, copie e cole diretamente o conteúdo de e-mails, relatórios ou pareceres técnicos recebidos.
              </p>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Exemplo: Em resposta à NC-015 referente ao torquímetro vencido no setor REC, informamos que a contenção foi a segregação imediata. A causa raiz apurada in loco foi a ausência de controle informatizado de alertas de calibração..."
                rows={9}
                className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono bg-slate-50"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">{pastedText.length} caracteres inseridos</span>
              <button
                onClick={handlePastedTextSubmit}
                disabled={!pastedText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
              >
                Prosseguir para Associação <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASSO 2: ASSOCIAÇÃO DA RNC & CONFIRMAÇÃO HUMANA (COM PROTOCOLO DE DÚVIDA) */}
      {/* ========================================================================= */}
      {step === 2 && correspondencia && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">ETAPA DE VINCULAÇÃO</span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Identificação & Associação da Não Conformidade
            </h2>
            <p className="text-sm text-slate-600">
              O sistema analisou o documento e propôs a associação com base no número, títulos e setor. Valide ou selecione a RNC correspondente antes de comparar.
            </p>
          </div>

          {/* Banner de Confiança / Dúvida */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              correspondencia.nivelConfianca === 'ALTA'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : correspondencia.nivelConfianca === 'MEDIA'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {correspondencia.nivelConfianca === 'ALTA' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : correspondencia.nivelConfianca === 'MEDIA' ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <HelpCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm uppercase">
                    Grau de Certeza da IA: {correspondencia.confianca}% ({correspondencia.nivelConfianca})
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/80 border font-mono">
                    Método: {correspondencia.metodoIdentificacao}
                  </span>
                </div>
                {correspondencia.duvidaMotivo ? (
                  <p className="text-xs mt-1 font-medium text-rose-800">
                    ⚠️ {correspondencia.duvidaMotivo}
                  </p>
                ) : (
                  <p className="text-xs mt-1">
                    Número de RNC detectado com clareza no cabeçalho do documento respondido.
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs bg-white px-3 py-1.5 rounded-lg border shadow-xs">
              Arquivo: <strong>{uploadedFile?.name || 'Texto Colado'}</strong>
            </div>
          </div>

          {/* Seleção ou Confirmação da RNC Alvo */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-800">
              Selecione a RNC Oficial no Cadastro do QualiGest:
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {records.map((rnc) => {
                const isSelected = selectedRNCId === rnc.id;
                const isSuggested = correspondencia.rncId === rnc.id;

                return (
                  <div
                    key={rnc.id}
                    onClick={() => setSelectedRNCId(rnc.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-sm text-slate-900">
                        {rnc.numeroNC}
                      </span>
                      {isSuggested && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          Sugerida pela IA
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-800 line-clamp-2 mb-2">
                      {rnc.titulo}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span>Setor: {rnc.setor || 'Geral'}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {rnc.statusGeral}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seletor Manual caso a lista seja muito longa */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <select
              value={selectedRNCId}
              onChange={(e) => setSelectedRNCId(e.target.value)}
              className="w-full sm:w-auto flex-1 text-sm p-2.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">-- Ou escolha na lista suspensa completa --</option>
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.numeroNC} — {r.titulo.substring(0, 60)} ({r.setor || 'Geral'})
                </option>
              ))}
            </select>
          </div>

          {/* Justificativa Humana se divergir da sugestão automática */}
          {correspondencia.rncId && selectedRNCId !== correspondencia.rncId && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <label className="block text-xs font-bold text-amber-900">
                Justificativa do Auditor (Você selecionou uma RNC diferente da sugerida pela IA):
              </label>
              <input
                type="text"
                value={manualConfirmJustification}
                onChange={(e) => setManualConfirmJustification(e.target.value)}
                placeholder="Ex: O documento cita NC-015 por engano de digitação, mas o escopo do texto refere-se integralmente à NC-012."
                className="w-full text-xs p-2.5 border border-amber-300 rounded bg-white"
              />
            </div>
          )}

          {/* Botões de Ação do Passo 2 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Upload
            </button>

            <button
              onClick={handleExecuteComparison}
              disabled={!selectedRNCId || isAnalyzing}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Analisando Semântica & Divergências...
                </>
              ) : (
                <>
                  Iniciar Comparação Semântica <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASSO 3: PAINEL DE COMPARAÇÃO SEMÂNTICA, DIVERGÊNCIAS & DECISÃO HUMANA   */}
      {/* ========================================================================= */}
      {step === 3 && comparisonResult && (
        <div className="space-y-6">
          {/* Card Resumo com Taxa de Concordância */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    RNC ASSOCIADA: {comparisonResult.numeroNCAssociada}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">
                    Fonte: {comparisonResult.nomeArquivoFonte}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Painel de Comparação & Resolução de Divergências
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Revise campo a campo. A regra do SGQ determina que <strong>a resposta real do usuário prevalece</strong> sobre as hipóteses preliminares.
                </p>
              </div>

              {/* Métricas de Concordância */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-center px-3 border-r border-slate-200">
                  <span className="text-2xl font-black text-indigo-600">
                    {comparisonResult.resumoComparacao.taxaConcordancia}%
                  </span>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Concordância</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                    <span className="font-bold text-emerald-700">{comparisonResult.resumoComparacao.convergentes}</span>
                    <p className="text-[9px] text-emerald-600">Convergentes</p>
                  </div>
                  <div className="px-2 py-1 bg-amber-50 rounded border border-amber-200">
                    <span className="font-bold text-amber-700">{comparisonResult.resumoComparacao.complementares}</span>
                    <p className="text-[9px] text-amber-600">Complementos</p>
                  </div>
                  <div className="px-2 py-1 bg-orange-50 rounded border border-orange-200">
                    <span className="font-bold text-orange-700">
                      {comparisonResult.resumoComparacao.divergentes + comparisonResult.resumoComparacao.contraditorios}
                    </span>
                    <p className="text-[9px] text-orange-600">Divergências</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Campos Comparados Lado a Lado */}
          <div className="space-y-4">
            {comparisonResult.camposComparados.map((campo) => {
              const decisaoAtual = campoDecisoes[campo.campoId]?.decisao || 'ACEITAR_RESPOSTA_USUARIO';
              const valorAprovado = campoDecisoes[campo.campoId]?.valorFinalAprovado;

              return (
                <div
                  key={campo.campoId}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  {/* Cabeçalho do Campo com Classificação */}
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-sm">{campo.nomeCampo}</span>
                      {renderClassificationBadge(campo.classificacao)}
                    </div>

                    <span className="text-xs text-slate-500 italic">
                      Sugestão do Sistema: <strong>{campo.sugestaoPrevalencia.replace(/_/g, ' ')}</strong>
                    </span>
                  </div>

                  {/* Comparação Lado a Lado */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coluna 1: QualiGest Original (Hipótese da IA / Cadastro) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-slate-400" />
                          Análise Inicial QualiGest / IA
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Registro Original</span>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 min-h-[90px] whitespace-pre-wrap">
                        {campo.valorOriginalQualiGest || <span className="text-slate-400 italic">Não preenchido</span>}
                      </div>
                    </div>

                    {/* Coluna 2: Resposta Efetiva do Usuário (Documento Respondido) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          Resposta Efetiva do Usuário
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Prevalência SGQ
                        </span>
                      </div>
                      <div className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-200 text-sm text-slate-900 min-h-[90px] whitespace-pre-wrap font-medium">
                        {campo.valorRespostaUsuario || <span className="text-slate-400 italic">Não informado no documento</span>}
                      </div>
                    </div>
                  </div>

                  {/* Justificativa Semântica */}
                  <div className="px-6 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p>{campo.explicacaoAnalise}</p>
                  </div>

                  {/* Barra de Decisão do Auditor */}
                  <div className="px-6 py-3 bg-slate-100/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-slate-500" /> Decisão do Auditor para este campo:
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleDecisionChange(campo.campoId, 'ACEITAR_RESPOSTA_USUARIO')}
                        className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                          decisaoAtual === 'ACEITAR_RESPOSTA_USUARIO'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> Adotar Resposta do Usuário
                      </button>

                      <button
                        onClick={() => handleDecisionChange(campo.campoId, 'MANTER_ORIGINAL')}
                        className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                          decisaoAtual === 'MANTER_ORIGINAL'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Manter Original
                      </button>

                      <button
                        onClick={() => handleDecisionChange(campo.campoId, 'MESCLAR_AMBOS')}
                        className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                          decisaoAtual === 'MESCLAR_AMBOS'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Mesclar Ambos
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Seção de Parecer Final do Auditor */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" /> Parecer Formal do Auditor / Gestor SGQ
            </h3>
            <textarea
              value={auditorNotes}
              onChange={(e) => setAuditorNotes(e.target.value)}
              placeholder="Descreva observações sobre a coerência do plano de ação respondido, eficácia das contenções e recomendações para o comitê de qualidade..."
              rows={3}
              className="w-full text-sm p-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500"
            />

            {/* Ações Finais: Salvar / Aplicar / Promover */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Alterar RNC
              </button>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={handleSaveAnalysisOnly}
                  className="px-4 py-2.5 bg-slate-700 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" /> Salvar Apenas Análise
                </button>

                <button
                  onClick={handlePromoteToKnowledgeBase}
                  disabled={isPromotingKnowledge}
                  className="px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isPromotingKnowledge ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                  Promover a Padrão SGQ
                </button>

                <button
                  onClick={handleApplyToOfficialRNC}
                  disabled={isApplyingToNC}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isApplyingToNC ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Aplicar na RNC Oficial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASSO 4: CONCLUSÃO COM CONFIRMAÇÃO E RASTREABILIDADE                     */}
      {/* ========================================================================= */}
      {step === 4 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Operação Concluída com Sucesso!</h2>
            <p className="text-sm text-slate-600 mt-2">
              A resposta do documento foi processada com total rastreabilidade. A regra de prevalência do usuário foi aplicada e registrada na trilha de auditoria do SGQ.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setStep(1);
                setUploadedFile(null);
                setPastedText('');
                setExtractedText('');
                setComparisonResult(null);
                setSuccessMsg(null);
              }}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
            >
              <Upload className="w-4 h-4" /> Comparar Novo Documento
            </button>

            {onNavigateToTab && (
              <>
                <button
                  onClick={() => onNavigateToTab('validacaoQueue')}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 flex items-center gap-2 border border-slate-300"
                >
                  <Eye className="w-4 h-4" /> Ver Fila de Validação
                </button>
                <button
                  onClick={() => onNavigateToTab('knowledgeBase')}
                  className="px-4 py-2.5 bg-amber-50 text-amber-800 rounded-lg text-sm font-semibold hover:bg-amber-100 flex items-center gap-2 border border-amber-200"
                >
                  <BookOpen className="w-4 h-4" /> Base de Conhecimento
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
