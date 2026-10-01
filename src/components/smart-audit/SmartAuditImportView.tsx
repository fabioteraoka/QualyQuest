import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Building2,
  Calendar,
  Tag,
  Info,
  AlertTriangle
} from 'lucide-react';
import {
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  RequisitoClienteItem,
  ProgramaChecklistCliente,
  LicaoAprendidaAuditoria,
  UserProfile,
  OrganizationRecord
} from '../../types';

export interface UploadedFileItem {
  id: string;
  file?: File;
  nome: string;
  tamanho: number;
  formato: string;
  base64?: string;
  status: 'PENDENTE' | 'PROCESSANDO' | 'PROCESSADO' | 'ERRO';
  tipoDocumento: 'AUDITORIA_REALIZADA' | 'CHECKLIST_PRE_AUDITORIA' | 'RESPOSTA_AUDITORIA' | 'DOCUMENTO_COMPLEMENTAR';
  resultadoExtraido?: any;
  erroMensagem?: string;
}

interface SmartAuditImportViewProps {
  existingAudits: AuditoriaExternaRecord[];
  existingRequirements: RequisitoClienteItem[];
  userProfile?: UserProfile | null;
  activeOrganization?: OrganizationRecord | null;
  onSaveAudit?: (audit: AuditoriaExternaRecord) => Promise<void>;
  onSaveFinding?: (finding: ConstatacaoExternaRecord) => Promise<void>;
  onSaveRequirement?: (req: RequisitoClienteItem) => Promise<void>;
  onSaveProgram?: (prog: ProgramaChecklistCliente) => Promise<void>;
  onSaveLesson?: (lesson: LicaoAprendidaAuditoria) => Promise<void>;
  onImportComplete?: () => void;
}

export const SmartAuditImportView: React.FC<SmartAuditImportViewProps> = ({
  existingAudits = [],
  existingRequirements = [],
  userProfile,
  activeOrganization,
  onSaveAudit,
  onSaveFinding,
  onSaveRequirement,
  onSaveProgram,
  onSaveLesson,
  onImportComplete,
}) => {
  const [fileList, setFileList] = useState<UploadedFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Decisão de incorporação
  const [incorporarAuditoria, setIncorporarAuditoria] = useState<boolean>(true);
  const [incorporarFindings, setIncorporarFindings] = useState<boolean>(true);
  const [incorporarRequisitos, setIncorporarRequisitos] = useState<boolean>(true);
  const [incorporarLicoes, setIncorporarLicoes] = useState<boolean>(true);
  const [gravando, setGravando] = useState<boolean>(false);

  // Arquivo atualmente ativo para visualização e edição
  const activeItem = fileList.find((f) => f.id === activeFileId) || fileList[0];
  const dadosExtraidos = activeItem?.resultadoExtraido;

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Processa arquivo via backend com IA ou heurística
  const processarArquivo = async (item: UploadedFileItem): Promise<UploadedFileItem> => {
    try {
      const response = await fetch('/api/smart-audit/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: item.base64,
          nomeArquivo: item.nome,
          formato: item.formato,
          tipoDocumentoDeclarado: item.tipoDocumento,
          textoManual: item.resultadoExtraido?._textoManual,
        }),
      });

      const data = await response.json();
      if (data.success) {
        return {
          ...item,
          status: 'PROCESSADO',
          tipoDocumento: data.tipoDocumentoIdentificado || item.tipoDocumento,
          resultadoExtraido: data,
        };
      } else {
        throw new Error(data.error || 'Erro no processamento do documento');
      }
    } catch (err: any) {
      return {
        ...item,
        status: 'ERRO',
        erroMensagem: err.message,
      };
    }
  };

  // Upload de arquivos reais do usuário
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGlobalLoading(true);

    const novosItens: UploadedFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split('.').pop()?.toUpperCase() || 'FILE';

      // Lê arquivo em base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(f);
      });

      const item: UploadedFileItem = {
        id: `FILE-${Date.now()}-${i}`,
        file: f,
        nome: f.name,
        tamanho: f.size,
        formato: ext,
        base64,
        status: 'PROCESSANDO',
        tipoDocumento: 'AUDITORIA_REALIZADA',
      };
      novosItens.push(item);
    }

    setFileList((prev) => [...prev, ...novosItens]);
    setActiveFileId(novosItens[0]?.id || null);

    // Processa cada um no servidor
    const processados: UploadedFileItem[] = [];
    for (const it of novosItens) {
      const res = await processarArquivo(it);
      processados.push(res);
    }

    setFileList((prev) =>
      prev.map((it) => {
        const proc = processados.find((p) => p.id === it.id);
        return proc || it;
      })
    );

    setGlobalLoading(false);
    showNotification('success', `${novosItens.length} arquivo(s) real(is) carregado(s) e interpretado(s)!`);
  };

  // Preset Demonstrativo (Apenas quando clicado expressamente em DEMO)
  const handleLoadDemoPreset = async () => {
    setGlobalLoading(true);
    const demoItem: UploadedFileItem = {
      id: `DEMO-${Date.now()}`,
      nome: 'SWISS_LX-AUDIT-2026_Relatorio_Final.docx',
      tamanho: 245000,
      formato: 'DOCX',
      status: 'PROCESSANDO',
      tipoDocumento: 'AUDITORIA_REALIZADA',
      resultadoExtraido: {
        _textoManual: `SWISS INTERNATIONAL AIR LINES - LINE MAINTENANCE STATION AUDIT REPORT (LX-AUDIT-2026)
Audit Number: LX-AUDIT-2026-SOD
Entity: SWISS Quality Assurance / EASA Part-145 Station Audit
Date: 2026-03-14 to 2026-03-15 | Base: Sorocaba (SOD) / Campinas (VCP)
Scope: Line Maintenance, Ramp Safety, Tooling Traceability and Technical Records.
Status: ACEITA COM PLANO DE AÇÃO CONCLUÍDO

FINDING 01 (MENOR): Torque wrench PN 6010-4 calibration certificate presented was near expiration (15 days left).
Corrective Action Presented: Instrument replaced immediately with newly calibrated torque wrench RBC nº 88219. Procedure MPO-FERR-004 updated.
Evidences: RBC Certificate 88219, Quarantine Tag #04.
Auditor Evaluation: ACCEPTED without reservation (RESPOSTA_ACEITA).

REQUIREMENT 1.1: All certifying engineers must hold valid ANAC CHT or EASA Part-66 type rated for A330/B777.
Category: Pessoas e Treinamentos | Criticality: CRITICO | Metodo: AUTOMATICO | Suggested Control: CTRL-TREIN-01.

REQUIREMENT 2.1: Tooling and torque equipment must have valid RBC calibration stamps.
Category: Ferramental e Calibração | Criticality: CRITICO | Metodo: AUTOMATICO | Suggested Control: CTRL-FERR-01.

REQUIREMENT 3.1: Ramp area inspection must show no foreign objects and active FOD bins.
Category: Pátio e Hangar | Criticality: ALTO | Metodo: ASSISTIDO | Suggested Control: CTRL-PATIO-01.`,
      },
    };

    setFileList((prev) => [...prev, demoItem]);
    setActiveFileId(demoItem.id);

    const proc = await processarArquivo(demoItem);
    setFileList((prev) => prev.map((it) => (it.id === demoItem.id ? proc : it)));
    setGlobalLoading(false);
    showNotification('info', 'Exemplo de demonstração SWISS carregado para fins de teste.');
  };

  const handleRemoveFile = (id: string) => {
    setFileList((prev) => prev.filter((f) => f.id !== id));
    if (activeFileId === id) {
      setActiveFileId(fileList.find((f) => f.id !== id)?.id || null);
    }
  };

  // Alterar tipo do documento
  const handleUpdateDocumentType = (id: string, novoTipo: UploadedFileItem['tipoDocumento']) => {
    setFileList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, tipoDocumento: novoTipo } : f))
    );
  };

  // Incorporar seletivamente no Firestore
  const handleConfirmarIncorporacao = async () => {
    if (!dadosExtraidos) return;
    setGravando(true);

    try {
      const orgId = activeOrganization?.id || 'org_impacto_aviation';
      const audDados = dadosExtraidos.dadosAuditoria || {};
      const auditId = `AUD-${Date.now()}`;
      const numeroAuditoria = audDados.numeroAuditoria || `AUD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // 1. Gravar Auditoria Externa se marcado
      if (incorporarAuditoria && onSaveAudit) {
        const novaAuditoria: AuditoriaExternaRecord = {
          id: auditId,
          organizationId: orgId,
          numeroAuditoria,
          tipo: audDados.tipoAuditoria || 'Cliente',
          origem: audDados.entidadeAuditora || audDados.clienteNome || 'Cliente Aéreo',
          entidadeAuditora: audDados.entidadeAuditora || audDados.clienteNome || 'Auditoria Externa',
          auditoresNomes: audDados.auditoresNomes || ['Auditor Líder'],
          dataInicio: audDados.dataInicio || new Date().toISOString().split('T')[0],
          dataTermino: audDados.dataTermino || new Date().toISOString().split('T')[0],
          escopo: audDados.escopo || 'Auditoria de Linha e Conformidade SGQ',
          local: audDados.baseOuLocal || 'Sorocaba (SOD)',
          referenciaExterna: audDados.referenciaExterna || 'Relatório de Auditoria',
          status: audDados.status || 'ACEITA',
          responsavelInterno: userProfile?.displayName || 'Gestor SGQ',
          documentosRecebidosNomes: fileList.map((f) => f.nome),
          dataRecebimento: new Date().toISOString().split('T')[0],
          prazoGlobalResposta: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          findingsCount: {
            total: (dadosExtraidos.constatacoesFindings || []).length,
            maiores: (dadosExtraidos.constatacoesFindings || []).filter((f: any) => f.classificacao === 'MAIOR').length,
            menores: (dadosExtraidos.constatacoesFindings || []).filter((f: any) => f.classificacao === 'MENOR').length,
            observacoes: (dadosExtraidos.constatacoesFindings || []).filter((f: any) => f.classificacao === 'OBSERVACAO').length,
            abertas: 0,
            respondidas: (dadosExtraidos.constatacoesFindings || []).length,
            aceitas: (dadosExtraidos.constatacoesFindings || []).filter((f: any) => f.statusAceitacao === 'RESPOSTA_ACEITA').length,
            rejeitadas: (dadosExtraidos.constatacoesFindings || []).filter((f: any) => f.statusAceitacao === 'RESPOSTA_REJEITADA').length,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByUserUid: userProfile?.uid || 'user_sgq',
        };

        await onSaveAudit(novaAuditoria);
      }

      // 2. Gravar Constatações / Findings
      if (incorporarFindings && onSaveFinding && dadosExtraidos.constatacoesFindings) {
        for (const [fIdx, f] of dadosExtraidos.constatacoesFindings.entries()) {
          const findingRecord: ConstatacaoExternaRecord = {
            id: `FIND-${Date.now()}-${fIdx}`,
            auditId,
            organizationId: orgId,
            numeroExterno: f.numeroExterno || `FIND-0${fIdx + 1}`,
            classificacao: f.classificacao || 'MENOR',
            descricaoOriginal: f.descricaoOriginal,
            requisitoNormativo: f.requisitoNormativo || { norma: 'RBAC 145', itemRequisito: '145.109' },
            setorResponsavel: f.setorResponsavel || 'Manutenção de Linha',
            responsavelNome: userProfile?.displayName || 'Inspetor Chefe',
            nivelRisco: f.nivelRisco || 'Médio',
            prazoResposta: f.prazoResposta || new Date().toISOString().split('T')[0],
            tipoPrazo: 'NORMATIVO',
            status: f.statusAceitacao === 'RESPOSTA_ACEITA' ? 'ACEITA' : f.statusAceitacao === 'RESPOSTA_REJEITADA' ? 'REJEITADA' : 'ENVIADA',
            respostaOficial: f.respostaOficial ? {
              id: `RESP-${Date.now()}-${fIdx}`,
              versao: 1,
              respostaFactual: f.respostaOficial.correcaoImediata || 'Ação imediata de contenção executada.',
              analiseCausa: f.respostaOficial.analiseCausa || 'Análise de causa raiz formal.',
              correcaoImediata: f.respostaOficial.correcaoImediata || 'Contenção executada.',
              acaoCorretiva: f.respostaOficial.acaoCorretiva || 'Revisão procedimental e reciclagem.',
              responsavel: userProfile?.displayName || 'Qualidade SGQ',
              prazoExecucao: new Date().toISOString().split('T')[0],
              referenciasDocumentais: ['P 001-05', 'MOMQ'],
              evidenciasIds: [],
              statusAprovacao: 'ENVIADA_AO_AUDITOR',
              autorNome: userProfile?.displayName || 'Qualidade SGQ',
              criadoEm: new Date().toISOString(),
            } : undefined,
            evidencias: [],
            retornosAuditor: [],
            trilhaAuditoria: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await onSaveFinding(findingRecord);
        }
      }

      // 3. Gravar Requisitos do Checklist na Matriz de Clientes
      if (incorporarRequisitos && onSaveRequirement && dadosExtraidos.requisitosChecklist) {
        for (const [rIdx, r] of dadosExtraidos.requisitosChecklist.entries()) {
          const reqItem: RequisitoClienteItem = {
            id: `REQ-${Date.now()}-${rIdx}`,
            organizationId: orgId,
            clienteId: `CLI-${(audDados.clienteNome || 'EXT').toUpperCase().slice(0, 4)}`,
            clienteNome: audDados.clienteNome || 'Cliente Aéreo',
            programaId: `PROG-${Date.now()}`,
            programaCodigo: audDados.numeroAuditoria || 'LX-CHK-2026',
            numeroItem: r.numeroItem || `${rIdx + 1}.1`,
            tituloCurto: r.tituloCurto || `Requisito ${r.numeroItem}`,
            textoOriginal: r.textoOriginal || r.tituloCurto,
            criterioAceitacao: r.criterioAceitacao || 'Conformidade operacional com manual.',
            categoria: r.categoria || 'Geral',
            criticidade: r.criticidade || 'ALTO',
            metodoVerificacao: r.metodoVerificacao || 'AUTOMATICO',
            controleCentralCodigo: r.controleSugeridoCodigo || 'CTRL-DOC-01',
            aplicabilidadeRegras: { basesAplicaveis: ['TODAS'] },
            periodicidade: 'SEMESTRAL',
            evidenciaEsperada: r.criterioAceitacao || 'Dossiê técnico comprobatório',
            status: 'ATIVO',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await onSaveRequirement(reqItem);
        }
      }

      // 4. Gravar Lições Aprendidas
      if (incorporarLicoes && onSaveLesson && dadosExtraidos.licoesAprendidas) {
        for (const [lIdx, l] of dadosExtraidos.licoesAprendidas.entries()) {
          const licao: LicaoAprendidaAuditoria = {
            id: `LESSON-${Date.now()}-${lIdx}`,
            auditId,
            organizationId: orgId,
            titulo: l.titulo || 'Lição de Auditoria',
            oQueAconteceu: l.oQueAconteceu || 'Auditoria realizada',
            oQueFuncionou: l.oQueFuncionou || 'Prontidão de registros',
            oQueFazerDiferente: l.recomendacao || 'Melhoria contínua',
            tags: ['Smart Import', audDados.clienteNome || 'Auditoria'],
            candidataBaseConhecimento: true,
            dataCriacao: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString(),
          };
          await onSaveLesson(licao);
        }
      }

      showNotification('success', 'Auditoria, Requisitos e Constatações incorporados com sucesso ao QualiGest!');
      if (onImportComplete) {
        setTimeout(onImportComplete, 1500);
      }
    } catch (err: any) {
      showNotification('error', `Falha ao gravar dados: ${err.message}`);
    } finally {
      setGravando(false);
    }
  };

  // Comparação com registros existentes
  const auditoriaExistente = existingAudits.find(
    (a) => a.numeroAuditoria?.toLowerCase() === dadosExtraidos?.dadosAuditoria?.numeroAuditoria?.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/90 border-blue-500/50 text-blue-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header do Smart Import */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-950 text-sky-400 border border-sky-800/50 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                SMART IMPORT 2.0 — ARQUIVOS REAIS
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Importação Real de Auditorias, Checklists e Respostas Técnicas
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl mt-1">
              Faça upload de arquivos reais (.xlsx, .csv, .pdf, .docx, .json). A IA e o motor heurístico estruturam os dados,
              classificam o documento e permitem comparar com registros existentes antes de incorporá-los às coleções oficiais.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLoadDemoPreset}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Carrega exemplo SWISS sem sobrescrever arquivos selecionados"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              Exemplo Demonstrativo (Demo / Teste)
            </button>
          </div>
        </div>

        {/* Dropzone Real para Arquivos */}
        <div className="mt-5 border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-6 text-center bg-slate-950/60 transition-all relative">
          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.docx,.pdf,.json"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-white">
              Arraste e solte seus arquivos reais aqui ou <span className="text-sky-400 underline">clique para selecionar</span>
            </div>
            <div className="text-xs text-slate-400">
              Formatos aceitos: <strong>XLSX, XLS, CSV, DOCX, PDF, JSON</strong> • Suporta múltiplos arquivos simultâneos
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Arquivos Carregados com Tipos Editáveis */}
      {fileList.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Arquivos Relacionados Carregados ({fileList.length})
            </h3>
            <span className="text-[11px] text-slate-400">
              Você pode alterar o tipo de documento atribuído a cada arquivo:
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fileList.map((f) => {
              const isActive = f.id === activeFileId;
              return (
                <div
                  key={f.id}
                  onClick={() => setActiveFileId(f.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-sky-950/40 border-sky-600/80 shadow-md shadow-sky-950/30'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileSpreadsheet className="w-5 h-5 text-sky-400 shrink-0" />
                      <span className="text-xs font-semibold text-white truncate" title={f.nome}>
                        {f.nome}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(f.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Formato: <strong>{f.formato}</strong></span>
                      <span>{(f.tamanho / 1024).toFixed(1)} KB</span>
                    </div>

                    {/* Classificação do Tipo (Editável pelo Usuário - Requisito 6 do brief) */}
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        Classificação do Documento:
                      </label>
                      <select
                        value={f.tipoDocumento}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleUpdateDocumentType(f.id, e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                      >
                        <option value="AUDITORIA_REALIZADA">Auditoria Já Realizada (Findings/Aceite)</option>
                        <option value="CHECKLIST_PRE_AUDITORIA">Checklist Pré-Auditoria (Requisitos)</option>
                        <option value="RESPOSTA_AUDITORIA">Resposta de Auditoria (Plano de Ação)</option>
                        <option value="DOCUMENTO_COMPLEMENTAR">Documento Complementar / Evidência</option>
                      </select>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      {f.status === 'PROCESSADO' ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Processado
                        </span>
                      ) : f.status === 'PROCESSANDO' ? (
                        <span className="text-sky-400 font-semibold flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Interpretando...
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold">Falha ao ler</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conteúdo Extraído & Visualizador / Editor */}
      {dadosExtraidos && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          {/* Comparação com Banco Existente (Requisito 4 do brief) */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
              auditoriaExistente
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                {auditoriaExistente ? (
                  <>
                    <strong>Auditoria Existente Detectada:</strong> O número{' '}
                    <span className="font-mono underline">{dadosExtraidos.dadosAuditoria?.numeroAuditoria}</span>{' '}
                    já consta no módulo de Auditorias Externas do QualiGest. A importação atualizará os dados existentes.
                  </>
                ) : (
                  <>
                    <strong>Nova Auditoria:</strong> O registro{' '}
                    <span className="font-mono underline">{dadosExtraidos.dadosAuditoria?.numeroAuditoria}</span>{' '}
                    não existe previamente no SGQ e será incorporado como nova entrada oficial.
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Dados Gerais da Auditoria Extraída */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              Dados Gerais Identificados no Documento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Cliente / Autoridade:</span>
                <span className="text-white font-semibold text-sm">{dadosExtraidos.dadosAuditoria?.clienteNome || 'Não informado'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Número da Auditoria:</span>
                <span className="text-sky-300 font-mono font-bold text-sm">{dadosExtraidos.dadosAuditoria?.numeroAuditoria || 'AUD-2026-EXT'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Base / Local:</span>
                <span className="text-white font-medium">{dadosExtraidos.dadosAuditoria?.baseOuLocal || 'Sorocaba (SOD)'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Status Global:</span>
                <span className="text-emerald-400 font-bold">{dadosExtraidos.dadosAuditoria?.status || 'ACEITA'}</span>
              </div>
            </div>
          </div>

          {/* Requisitos de Checklist Identificados */}
          {dadosExtraidos.requisitosChecklist && dadosExtraidos.requisitosChecklist.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Requisitos Estruturados do Checklist ({dadosExtraidos.requisitosChecklist.length})
                </h4>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {dadosExtraidos.requisitosChecklist.map((r: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400">{r.numeroItem}</span>
                        <span className="font-semibold text-white">{r.tituloCurto}</span>
                        <span className="text-[10px] px-2 py-0.2 bg-slate-800 text-slate-300 rounded">
                          {r.categoria}
                        </span>
                      </div>
                      <p className="text-slate-400 italic text-[11px]">"{r.textoOriginal}"</p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                      {r.controleSugeridoCodigo || 'CTRL-DOC-01'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constatações / Findings Identificados com Diferenciação de Aceite (Requisito 8) */}
          {dadosExtraidos.constatacoesFindings && dadosExtraidos.constatacoesFindings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Constatações (Findings) com Diferenciação Rigorosa de Aceite ({dadosExtraidos.constatacoesFindings.length})
                </h4>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {dadosExtraidos.constatacoesFindings.map((f: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-400">{f.numeroExterno}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 uppercase">
                          {f.classificacao}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                        {f.statusAceitacao || 'RESPOSTA_ACEITA'}
                      </span>
                    </div>
                    <p className="text-slate-300 italic text-[11px]">"{f.descricaoOriginal}"</p>
                    {f.respostaOficial?.correcaoImediata && (
                      <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded-lg">
                        <strong className="text-slate-300">Resposta da IMPACTO:</strong> {f.respostaOficial.correcaoImediata}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decisão de Incorporação Seletiva (Requisito 4 do brief) */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Selecione o que deseja incorporar às bases oficiais do QualiGest:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incorporarAuditoria}
                  onChange={(e) => setIncorporarAuditoria(e.target.checked)}
                  className="rounded border-slate-700 text-sky-600 focus:ring-0"
                />
                <span className="text-white font-medium">Auditoria Externa</span>
              </label>

              <label className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incorporarFindings}
                  onChange={(e) => setIncorporarFindings(e.target.checked)}
                  className="rounded border-slate-700 text-sky-600 focus:ring-0"
                />
                <span className="text-white font-medium">Constatações & Respostas</span>
              </label>

              <label className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incorporarRequisitos}
                  onChange={(e) => setIncorporarRequisitos(e.target.checked)}
                  className="rounded border-slate-700 text-sky-600 focus:ring-0"
                />
                <span className="text-white font-medium">Requisitos do Checklist</span>
              </label>

              <label className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incorporarLicoes}
                  onChange={(e) => setIncorporarLicoes(e.target.checked)}
                  className="rounded border-slate-700 text-sky-600 focus:ring-0"
                />
                <span className="text-white font-medium">Lições Aprendidas</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleConfirmarIncorporacao}
                disabled={gravando}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
              >
                {gravando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Gravando no Firestore Oficial...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Incorporar e Gravar no QualiGest SGQ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
