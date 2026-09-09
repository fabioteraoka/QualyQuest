import React, { useState } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  Clock, 
  User, 
  X, 
  Copy, 
  Check, 
  FileCheck,
  AlertTriangle,
  FileQuestion,
  CheckSquare,
  Cpu,
  Edit3,
  XCircle,
  Eye,
  ListChecks
} from 'lucide-react';
import { NivelSuporteDocumental, SuggestionDecision, StatusDecisaoSugestao } from '../types';
import { obterEstiloSuporteDocumental } from '../utils/qualityHelpers';

export interface AISuggestionResult {
  origemMotor?: string;
  enquadramentoManualSugerido?: string;
  itemRequisitoIdentificado?: string;
  procedimentoInternoRecomendado?: string;
  manuaisConsultados?: string[];
  preAnaliseCausaContencao?: {
    descricao: string;
    justificativaNormativa: string;
    prazoSugeridoDias?: number;
    responsavelSugerido?: string;
  };
  analiseCausaRaiz?: {
    cincoPorques: string[];
    explicacaoCausaSistemica?: string;
    sinteseCausaRaiz: string;
    ishikawa: {
      metodo: string;
      maquina: string;
      maoDeObra: string;
      material: string;
      medicao: string;
      meioAmbiente: string;
    };
    statusValidacao?: string;
    evidenciasSustentacao?: string[];
    evidenciasFaltantes?: string[];
    perguntasInvestigacao?: string[];
    nivelSuporteDocumental?: NivelSuporteDocumental;
    justificativaSuporte?: string;
  };
  acaoCorretiva?: {
    descricao: string;
    comoSeraFeito?: string;
    responsavelSugerido?: string;
    prazoSugeridoDias?: number;
    metodoVerificacaoSugerido?: string;
  };
  // Fallbacks
  cincoPorques?: string[];
  ishikawa?: {
    metodo: string;
    maquina: string;
    maoDeObra: string;
    material: string;
    medicao: string;
    meioAmbiente: string;
  };
  planoAcaoSugerido?: string;
  acaoContencaoSugerida?: string;
}

interface AISuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  sugestao: AISuggestionResult | null;
  manualsCount: number;
  descricaoNC: string;
  normaReferencia?: string;
  currentUser?: string;
  decisoesSugestoes?: SuggestionDecision[];
  onAcceptSuggestion: (
    fieldId: string,
    fieldLabel: string,
    suggestedValue: any,
    source: string
  ) => void;
  onEditSuggestion: (
    fieldId: string,
    fieldLabel: string,
    originalValue: any,
    editedValue: any,
    source: string
  ) => void;
  onRejectSuggestion: (
    fieldId: string,
    fieldLabel: string,
    suggestedValue: any,
    source: string
  ) => void;
}

export const AISuggestionModal: React.FC<AISuggestionModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  sugestao,
  manualsCount,
  normaReferencia,
  currentUser = 'Auditor SGQ',
  decisoesSugestoes = [],
  onAcceptSuggestion,
  onEditSuggestion,
  onRejectSuggestion,
}) => {
  const [activeTab, setActiveTab] = useState<'todos' | 'contencao' | 'causa' | 'acao'>('todos');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  // Estado para edições em andamento de cada campo
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [fieldId: string]: string }>({});

  if (!isOpen) return null;

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const motorOrigem = sugestao?.origemMotor || 'IA GEMINI';
  const contencaoDesc = sugestao?.preAnaliseCausaContencao?.descricao || sugestao?.acaoContencaoSugerida || '';
  const cincoPorques = sugestao?.analiseCausaRaiz?.cincoPorques || sugestao?.cincoPorques || [];
  const ishikawa = sugestao?.analiseCausaRaiz?.ishikawa || sugestao?.ishikawa;
  const sinteseCausa = sugestao?.analiseCausaRaiz?.sinteseCausaRaiz || (cincoPorques.length > 0 ? cincoPorques[cincoPorques.length - 1] : '');
  const acaoDesc = sugestao?.acaoCorretiva?.descricao || sugestao?.planoAcaoSugerido || '';
  const comoSeraFeito = sugestao?.acaoCorretiva?.comoSeraFeito || '';
  const enquadramentoSugerido = sugestao?.enquadramentoManualSugerido || normaReferencia || '';
  const nivelSuporte = sugestao?.analiseCausaRaiz?.nivelSuporteDocumental || 'Evidência moderada';
  const suporteStyle = obterEstiloSuporteDocumental(nivelSuporte);

  // Helper para obter status da decisão de um campo
  const getDecisionStatus = (fieldId: string): StatusDecisaoSugestao => {
    const dec = decisoesSugestoes.find(d => d.field === fieldId);
    return dec ? dec.status : 'PENDENTE';
  };

  const renderStatusBadge = (status: StatusDecisaoSugestao) => {
    switch (status) {
      case 'ACEITA':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>✓ ACEITA</span>
          </span>
        );
      case 'EDITADA':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>✎ EDITADA</span>
          </span>
        );
      case 'REJEITADA':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>✕ REJEITADA</span>
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>○ PENDENTE DE REVISÃO</span>
          </span>
        );
    }
  };

  const startEditing = (fieldId: string, initialText: string) => {
    setEditingField(fieldId);
    setEditValues(prev => ({ ...prev, [fieldId]: prev[fieldId] !== undefined ? prev[fieldId] : initialText }));
  };

  const saveEdit = (fieldId: string, fieldLabel: string, originalValue: any) => {
    const editedText = editValues[fieldId];
    if (editedText !== undefined) {
      onEditSuggestion(fieldId, fieldLabel, originalValue, editedText, motorOrigem);
    }
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-[8px] bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Assistente Técnico de Investigação SGQ
                </h3>
                <span className="text-[10px] font-bold bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-[4px] border border-blue-700/50 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-blue-300" />
                  <span>{motorOrigem}</span>
                </span>
                <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-[4px] border border-slate-700">
                  {manualsCount} Manuais Normativos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Investigação técnica com base no acervo documental aeronáutico e diretrizes de compliance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="max-w-md">
              <h4 className="text-sm font-bold text-slate-900">Consultando Acervo Normativo e Formulando Hipóteses</h4>
              <p className="text-xs text-slate-500 mt-1">
                Avaliando manuais e estruturando hipóteses para contenção, 5 porquês e plano de ação...
              </p>
            </div>
          </div>
        )}

        {/* Content Body */}
        {!isLoading && sugestao && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
            
            {/* Warning Banner - Human validation mandatory */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Diretriz SGQ: Nenhuma sugestão é aceita automaticamente</strong>
                <span>
                  Cada hipótese técnica gerada deve ser avaliada individualmente pelo auditor ({currentUser}). Utilize os botões <strong>Aceitar</strong>, <strong>Editar</strong> ou <strong>Rejeitar</strong> em cada bloco.
                </span>
              </div>
            </div>

            {/* Enquadramento Normativo Sugerido */}
            {enquadramentoSugerido && (
              <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                      §
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                        SUGESTÃO DA IA • Campo: Requisito Normativo Aplicável
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        {enquadramentoSugerido}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${suporteStyle.bg} ${suporteStyle.text} ${suporteStyle.border}`}>
                      {nivelSuporte}
                    </span>
                    {renderStatusBadge(getDecisionStatus('enquadramento'))}
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/40 rounded-lg border border-indigo-100 text-xs space-y-1">
                  <div className="flex justify-between items-center text-[11px] text-slate-600">
                    <span><strong>Origem:</strong> {motorOrigem}</span>
                    <span><strong>Status:</strong> HIPÓTESE – REQUER VALIDAÇÃO HUMANA</span>
                  </div>
                  {sugestao.itemRequisitoIdentificado && (
                    <p className="font-semibold text-indigo-950 mt-1">
                      {sugestao.itemRequisitoIdentificado}
                    </p>
                  )}
                  {sugestao.procedimentoInternoRecomendado && (
                    <p className="text-[11px] text-slate-600">
                      {sugestao.procedimentoInternoRecomendado}
                    </p>
                  )}
                </div>

                {/* Ações de Decisão Humana */}
                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onRejectSuggestion('enquadramento', 'Requisito Normativo', enquadramentoSugerido, motorOrigem)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Rejeitar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAcceptSuggestion('enquadramento', 'Requisito Normativo', enquadramentoSugerido, motorOrigem)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Aceitar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Filter Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setActiveTab('todos')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'todos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas as Sugestões
              </button>
              <button
                onClick={() => setActiveTab('contencao')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'contencao' ? 'bg-amber-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>1. Contenção Imediata</span>
              </button>
              <button
                onClick={() => setActiveTab('causa')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'causa' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>2. Causa Raiz & Ishikawa</span>
              </button>
              <button
                onClick={() => setActiveTab('acao')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'acao' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>3. Ação Corretiva</span>
              </button>
            </div>

            {/* SECTION 1: CONTENÇÃO */}
            {(activeTab === 'todos' || activeTab === 'contencao') && contencaoDesc && (
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                        SUGESTÃO DA IA • Campo: Pré-Análise & Ação de Contenção
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Ação Imediata de Bloqueio / Segregação
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {renderStatusBadge(getDecisionStatus('contencao'))}
                    <button
                      onClick={() => handleCopy(contencaoDesc, 'contencao')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Copiar texto"
                    >
                      {copiedSection === 'contencao' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span><strong>Origem:</strong> {motorOrigem}</span>
                  <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    HIPÓTESE – REQUER VALIDAÇÃO HUMANA
                  </span>
                </div>

                {/* Conteúdo Sugerido ou Em Edição */}
                {editingField === 'contencao' ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editValues['contencao'] ?? contencaoDesc}
                      onChange={(e) => setEditValues(prev => ({ ...prev, contencao: e.target.value }))}
                      className="w-full text-xs p-3 rounded-lg border-2 border-indigo-400 focus:outline-none bg-white leading-relaxed"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit('contencao', 'Ação de Contenção Imediata', contencaoDesc)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                      >
                        Salvar e Incorporar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                    {contencaoDesc}
                  </div>
                )}

                {sugestao.preAnaliseCausaContencao?.justificativaNormativa && (
                  <div className="flex items-start space-x-2 text-[11px] text-amber-800 bg-amber-50/30 p-2 rounded-lg">
                    <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                    <span><strong>Fundamentação:</strong> {sugestao.preAnaliseCausaContencao.justificativaNormativa}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-[11px] text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span><strong>Prazo:</strong> {sugestao.preAnaliseCausaContencao?.prazoSugeridoDias || 2} dias</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span><strong>Responsável:</strong> {sugestao.preAnaliseCausaContencao?.responsavelSugerido || 'Supervisor do Setor'}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion('contencao', 'Ação de Contenção Imediata', contencaoDesc, motorOrigem)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Rejeitar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing('contencao', contencaoDesc)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAcceptSuggestion('contencao', 'Ação de Contenção Imediata', contencaoDesc, motorOrigem)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Aceitar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: 5 PORQUÊS & CAUSA RAIZ */}
            {(activeTab === 'todos' || activeTab === 'causa') && (
              <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                        SUGESTÃO DA IA • Campo: Investigação de Causa Raiz (5 Porquês)
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Cadeia Causal dos Porquês Encadeados
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {renderStatusBadge(getDecisionStatus('cincoPorques'))}
                    <button
                      onClick={() => handleCopy(cincoPorques.join('\n'), 'porques')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Copiar Porquês"
                    >
                      {copiedSection === 'porques' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span><strong>Origem:</strong> {motorOrigem}</span>
                  <span className="text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    HIPÓTESE DE INVESTIGAÇÃO – REQUER VALIDAÇÃO HUMANA
                  </span>
                </div>

                {/* Whys List */}
                <div className="space-y-2">
                  {cincoPorques.map((pq, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
                        idx === cincoPorques.length - 1 
                          ? 'bg-blue-50/60 border-blue-200 text-blue-950 font-medium' 
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        idx === cincoPorques.length - 1 ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{pq}</span>
                    </div>
                  ))}
                </div>

                {/* Síntese da Causa */}
                {sinteseCausa && (
                  <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200 text-xs text-blue-950 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-[11px] uppercase tracking-wide text-blue-900 block">
                        Síntese da Causa Raiz (Derivada do 5º Porquê):
                      </strong>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                        100% Coerente com a Cadeia Causal
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{sinteseCausa}</p>
                    {sugestao.analiseCausaRaiz?.explicacaoCausaSistemica && (
                      <p className="text-[11px] text-blue-800 pt-1 border-t border-blue-200/60">
                        <strong>Justificativa Sistêmica:</strong> {sugestao.analiseCausaRaiz.explicacaoCausaSistemica}
                      </p>
                    )}
                  </div>
                )}

                {/* Ações de Decisão para 5 Porquês */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onRejectSuggestion('cincoPorques', '5 Porquês & Causa Raiz', cincoPorques, motorOrigem)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Rejeitar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAcceptSuggestion('cincoPorques', '5 Porquês & Causa Raiz', cincoPorques, motorOrigem)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                    title="Aplica a cadeia dos 5 porquês e atualiza a síntese da causa raiz no formulário"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Aceitar 5 Porquês & Conclusão</span>
                  </button>
                </div>

                {/* Ishikawa 6M Cards */}
                {ishikawa && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                        SUGESTÃO DA IA • Campo: Diagrama de Ishikawa (6M)
                      </span>
                      {renderStatusBadge(getDecisionStatus('ishikawa'))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 block mb-1 text-[11px]">⚙️ Método</span>
                        <p className="text-slate-600 text-[11px] leading-snug">{ishikawa.metodo || '-'}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 block mb-1 text-[11px]">💻 Máquina / Sistema</span>
                        <p className="text-slate-600 text-[11px] leading-snug">{ishikawa.maquina || '-'}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 block mb-1 text-[11px]">👥 Mão de Obra</span>
                        <p className="text-slate-600 text-[11px] leading-snug">{ishikawa.maoDeObra || '-'}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 block mb-1 text-[11px]">📦 Material / Insumo</span>
                        <p className="text-slate-600 text-[11px] leading-snug">{ishikawa.material || '-'}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 block mb-1 text-[11px]">📏 Medição / Metrologia</span>
                        <p className="text-slate-600 text-[11px] leading-snug">{ishikawa.medicao || '-'}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700 block mb-1 text-[11px]">🌐 Meio Ambiente</span>
                        <p className="text-slate-600 text-[11px] leading-snug">{ishikawa.meioAmbiente || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onRejectSuggestion('ishikawa', 'Diagrama de Ishikawa', ishikawa, motorOrigem)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Rejeitar Ishikawa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptSuggestion('ishikawa', 'Diagrama de Ishikawa', ishikawa, motorOrigem)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Aceitar Ishikawa</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: PLANO DE AÇÃO CORRETIVA */}
            {(activeTab === 'todos' || activeTab === 'acao') && acaoDesc && (
              <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        SUGESTÃO DA IA • Campo: Plano de Ação Corretiva
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Ação Corretiva Proposta (5W2H)
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {renderStatusBadge(getDecisionStatus('acaoCorretiva'))}
                    <button
                      onClick={() => handleCopy(acaoDesc, 'acao')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Copiar Plano de Ação"
                    >
                      {copiedSection === 'acao' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span><strong>Origem:</strong> {motorOrigem}</span>
                  <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    HIPÓTESE – REQUER VALIDAÇÃO HUMANA
                  </span>
                </div>

                {/* Conteúdo Sugerido ou Em Edição */}
                {editingField === 'acaoCorretiva' ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editValues['acaoCorretiva'] ?? acaoDesc}
                      onChange={(e) => setEditValues(prev => ({ ...prev, acaoCorretiva: e.target.value }))}
                      className="w-full text-xs p-3 rounded-lg border-2 border-indigo-400 focus:outline-none bg-white leading-relaxed"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit('acaoCorretiva', 'Plano de Ação Corretiva', acaoDesc)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                      >
                        Salvar e Incorporar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                    {acaoDesc}
                  </div>
                )}

                {comoSeraFeito && (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                    <strong className="text-[11px] uppercase tracking-wide text-slate-600 block mb-0.5">
                      Como Será Feito:
                    </strong>
                    <p>{comoSeraFeito}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-[11px] text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span><strong>Prazo:</strong> {sugestao.acaoCorretiva?.prazoSugeridoDias || 30} dias</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span><strong>Responsável:</strong> {sugestao.acaoCorretiva?.responsavelSugerido || 'Garantia da Qualidade'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span><strong>Eficácia:</strong> {sugestao.acaoCorretiva?.metodoVerificacaoSugerido || 'Auditoria Interna'}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion('acaoCorretiva', 'Plano de Ação Corretiva', acaoDesc, motorOrigem)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Rejeitar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing('acaoCorretiva', acaoDesc)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAcceptSuggestion('acaoCorretiva', 'Plano de Ação Corretiva', acaoDesc, motorOrigem)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Aceitar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <ListChecks className="w-4 h-4 text-indigo-500" />
            <span>Decisões registradas na trilha de auditoria: <strong>{decisoesSugestoes.length}</strong> campos avaliados.</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Concluir Revisão e Voltar à NC
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
