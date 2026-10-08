import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Layers,
  Award,
  CheckCircle2,
  Filter,
  Search,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Scale,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import {
  ValidatedKnowledgeRecord,
  UserProfile,
  ComparacaoRNCRecord,
  NCRecord,
} from '../types';
import {
  subscribeToValidatedKnowledge,
  saveValidatedKnowledge,
  deleteValidatedKnowledge,
  subscribeToRNCComparisons,
} from '../services/firebase/firestore';

interface KnowledgeBaseViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  records: NCRecord[];
  onNavigateToComparison?: () => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  organizationId,
  userProfile,
  records,
  onNavigateToComparison,
}) => {
  const [knowledgeList, setKnowledgeList] = useState<ValidatedKnowledgeRecord[]>([]);
  const [comparisons, setComparisons] = useState<ComparacaoRNCRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedMaturity, setSelectedMaturity] = useState<string>('TODAS');

  // Modal para criar / editar padrão
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPattern, setEditingPattern] = useState<Partial<ValidatedKnowledgeRecord> | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    const unsubKnowledge = subscribeToValidatedKnowledge(
      organizationId,
      (list) => {
        setKnowledgeList(list);
        setLoading(false);
      },
      (err) => console.error('Erro ao buscar base de conhecimento:', err)
    );

    const unsubComp = subscribeToRNCComparisons(
      organizationId,
      (list) => setComparisons(list),
      (err) => console.error('Erro ao buscar comparações:', err)
    );

    return () => {
      unsubKnowledge();
      unsubComp();
    };
  }, [organizationId]);

  // Filtragem
  const filteredPatterns = knowledgeList.filter((item) => {
    const matchesCategory = selectedCategory === 'TODAS' || item.categoria === selectedCategory;
    const matchesMaturity = selectedMaturity === 'TODAS' || String(item.nivelMaturidade) === selectedMaturity;
    const matchesSearch =
      searchTerm === '' ||
      item.tituloPadrao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.causaValidada.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.setor && item.setor.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesMaturity && matchesSearch;
  });

  // Salvar / Atualizar Padrão
  const handleSavePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPattern?.tituloPadrao || !editingPattern?.causaValidada) {
      alert('Preencha ao menos o Título do Padrão e a Causa Raiz Validada.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const patternId = editingPattern.id || `know_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const recordToSave: ValidatedKnowledgeRecord = {
        id: patternId,
        tituloPadrao: editingPattern.tituloPadrao,
        categoria: editingPattern.categoria || 'Calibração e Metrologia',
        setor: editingPattern.setor || 'REC / Manutenção',
        contextoDesvio: editingPattern.contextoDesvio || 'Desvio factual apurado em campo',
        causaValidada: editingPattern.causaValidada,
        acoesCorretivasRecomendadas: editingPattern.acoesCorretivasRecomendadas || ['Revisão formal de procedimento e treinamento'],
        contencoesRecomendadas: editingPattern.contencoesRecomendadas || ['Segregação imediata'],
        normasAplicaveis: editingPattern.normasAplicaveis || ['MOMQ Item 3.4.3'],
        rncsOrigemNumeros: editingPattern.rncsOrigemNumeros || ['NC-015'],
        frequenciaObservada: editingPattern.frequenciaObservada || 1,
        nivelMaturidade: editingPattern.nivelMaturidade || 2,
        status: editingPattern.status || 'VALIDADO',
        validadoPorGestor: editingPattern.validadoPorGestor || userProfile?.displayName || userProfile?.email || 'Gestor SGQ',
        dataValidacao: editingPattern.dataValidacao || now.split('T')[0],
        justificativaSGQ: editingPattern.justificativaSGQ || 'Padrão validado pelo comitê de qualidade.',
        criadoEm: editingPattern.criadoEm || now,
        atualizadoEm: now,
      };

      await saveValidatedKnowledge(organizationId, recordToSave, userProfile);
      setIsModalOpen(false);
      setEditingPattern(null);
    } catch (err: any) {
      alert(`Erro ao salvar padrão: ${err.message}`);
    }
  };

  // Excluir Padrão
  const handleDeletePattern = async (id: string) => {
    if (!window.confirm('Confirma a exclusão deste padrão de conhecimento SGQ?')) return;
    try {
      await deleteValidatedKnowledge(organizationId, id, userProfile);
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  // IA Sintetizadora de Padrões
  const handleAutoSynthesize = async () => {
    if (comparisons.length === 0) {
      alert('Nenhuma comparação validada disponível para sintetizar padrões no momento.');
      return;
    }

    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/generate-knowledge-pattern', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
          'x-user-org-id': userProfile?.organizationId || '',
        },
        body: JSON.stringify({
          organizationId,
          comparacoesValidadas: comparisons,
          categoria: 'Calibração e Metrologia',
          setor: 'REC / Manutenção',
        }),
      });

      const data = await res.json();
      if (data.success && data.padrao) {
        setEditingPattern(data.padrao);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      console.error('Erro na síntese de padrão:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Badge de Maturidade (Nível 1 a 5)
  const renderMaturityBadge = (nivel: number) => {
    switch (nivel) {
      case 5:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Award className="w-3.5 h-3.5 text-purple-600" /> Nível 5 — Padrão Corporativo SGQ
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Nível 4 — Institucionalizado
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Nível 3 — Validado SGQ
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300">
            <Layers className="w-3.5 h-3.5 text-blue-600" /> Nível 2 — Padrão Emergente
          </span>
        );
      case 1:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300">
            <FileCheck className="w-3.5 h-3.5 text-slate-600" /> Nível 1 — Evidência Isolada
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                MEMÓRIA ORGANIZACIONAL & APRENDIZADO
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Base de Conhecimento Validada do SGQ
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Repositório institucional de causas raízes confirmadas e planos de ação eficazes validados por humanos. Alimenta as sugestões da IA com base na realidade comprovada da organização.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutoSynthesize}
              disabled={isSynthesizing}
              className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-2 border border-purple-200 transition-all disabled:opacity-50"
            >
              {isSynthesizing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-purple-600" />
              )}
              Sintetizar Padrões via IA
            </button>

            <button
              onClick={() => {
                setEditingPattern({
                  tituloPadrao: '',
                  categoria: 'Calibração e Metrologia',
                  setor: 'REC / Manutenção',
                  causaValidada: '',
                  nivelMaturidade: 3,
                  status: 'VALIDADO',
                });
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Novo Padrão de Qualidade
            </button>
          </div>
        </div>

        {/* Régua dos 5 Níveis de Maturidade */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-6 pt-4 border-t border-slate-100">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500">Nível 1</span>
            <p className="text-xs font-bold text-slate-800 mt-0.5">Evidência Isolada</p>
            <p className="text-[10px] text-slate-500">1 resposta validada</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-600">Nível 2</span>
            <p className="text-xs font-bold text-blue-900 mt-0.5">Padrão Emergente</p>
            <p className="text-[10px] text-blue-600">2-3 RNCs convergentes</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-600">Nível 3</span>
            <p className="text-xs font-bold text-emerald-900 mt-0.5">Validado SGQ</p>
            <p className="text-[10px] text-emerald-600">Aprovado por Gestor</p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-600">Nível 4</span>
            <p className="text-xs font-bold text-indigo-900 mt-0.5">Institucionalizado</p>
            <p className="text-[10px] text-indigo-600">Em POPs e Treinamentos</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-center">
            <span className="text-[10px] uppercase font-bold text-purple-600">Nível 5</span>
            <p className="text-xs font-bold text-purple-900 mt-0.5">Padrão SGQ</p>
            <p className="text-[10px] text-purple-600">Referência Corporativa</p>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por padrão de qualidade, causa ou setor..."
            className="text-sm w-full border-none focus:ring-0 bg-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="TODAS">Todas as Categorias</option>
            <option value="Calibração e Metrologia">Calibração e Metrologia</option>
            <option value="Documental e Manuais">Documental e Manuais</option>
            <option value="Capacitação e Treinamento">Capacitação e Treinamento</option>
            <option value="Execução e Ferramental">Execução e Ferramental</option>
          </select>

          <select
            value={selectedMaturity}
            onChange={(e) => setSelectedMaturity(e.target.value)}
            className="text-xs p-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="TODAS">Todos os Níveis</option>
            <option value="5">Nível 5 (Corporativo)</option>
            <option value="4">Nível 4 (Institucionalizado)</option>
            <option value="3">Nível 3 (Validado SGQ)</option>
            <option value="2">Nível 2 (Emergente)</option>
            <option value="1">Nível 1 (Evidência)</option>
          </select>
        </div>
      </div>

      {/* Grid de Padrões de Conhecimento */}
      {loading ? (
        <div className="p-12 bg-white rounded-xl text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm">Carregando repositório de conhecimento validado...</p>
        </div>
      ) : filteredPatterns.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-500 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-base font-bold text-slate-800">Nenhum padrão cadastrado ainda</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ao validar respostas de RNCs no módulo de comparação, promova as causas reais confirmadas para consolidar o repositório de lições aprendidas.
          </p>
          {onNavigateToComparison && (
            <button
              onClick={onNavigateToComparison}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 mt-2"
            >
              Ir para Comparação de RNCs
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPatterns.map((pattern) => (
            <div
              key={pattern.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  {renderMaturityBadge(pattern.nivelMaturidade)}
                  <span className="text-[11px] font-mono text-slate-400">
                    {pattern.setor || 'Geral'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {pattern.tituloPadrao}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Categoria: <strong>{pattern.categoria}</strong> • Validado por: <strong>{pattern.validadoPorGestor || 'Gestor SGQ'}</strong>
                </p>

                {/* Causa Raiz Validada */}
                <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-1 mb-3">
                  <p className="text-[10px] uppercase font-bold text-emerald-800">
                    Causa Raiz Validada (Fato Comprovado)
                  </p>
                  <p className="text-xs text-slate-800 font-medium">
                    {pattern.causaValidada}
                  </p>
                </div>

                {/* Ações Corretivas Recomendadas */}
                {pattern.acoesCorretivasRecomendadas && pattern.acoesCorretivasRecomendadas.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    <p className="text-[10px] uppercase font-bold text-slate-500">
                      Ações Corretivas Eficazes Padronizadas:
                    </p>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {pattern.acoesCorretivasRecomendadas.map((acao, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>{acao}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rastreabilidade de RNCs */}
                {pattern.rncsOrigemNumeros && pattern.rncsOrigemNumeros.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px] text-slate-500">
                    <span>RNCs Origem:</span>
                    {pattern.rncsOrigemNumeros.map((num, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                        {num}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações do Card */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Atualizado em: {new Date(pattern.atualizadoEm).toLocaleDateString('pt-BR')}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPattern(pattern);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded transition-colors"
                    title="Editar padrão"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeletePattern(pattern.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Excluir padrão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Padrão */}
      {isModalOpen && editingPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPattern.id ? 'Editar Padrão de Qualidade' : 'Novo Padrão de Qualidade Validado'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePattern} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Título do Padrão SGQ *
                </label>
                <input
                  type="text"
                  value={editingPattern.tituloPadrao || ''}
                  onChange={(e) => setEditingPattern({ ...editingPattern, tituloPadrao: e.target.value })}
                  placeholder="Ex: Controle Preventivo de Calibração em Ferramentas REC"
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={editingPattern.categoria || ''}
                    onChange={(e) => setEditingPattern({ ...editingPattern, categoria: e.target.value })}
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Setor Operacional
                  </label>
                  <input
                    type="text"
                    value={editingPattern.setor || ''}
                    onChange={(e) => setEditingPattern({ ...editingPattern, setor: e.target.value })}
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Causa Raiz Validada por Humanos *
                </label>
                <textarea
                  value={editingPattern.causaValidada || ''}
                  onChange={(e) => setEditingPattern({ ...editingPattern, causaValidada: e.target.value })}
                  placeholder="Descreva a causa raiz confirmada em campo pelos técnicos e inspetores..."
                  rows={3}
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Plano de Ação Corretiva Recomendado
                </label>
                <textarea
                  value={(editingPattern.acoesCorretivasRecomendadas || []).join('\n')}
                  onChange={(e) => setEditingPattern({
                    ...editingPattern,
                    acoesCorretivasRecomendadas: e.target.value.split('\n').filter(Boolean),
                  })}
                  placeholder="Insira uma ação por linha..."
                  rows={3}
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nível de Maturidade (1 a 5)
                  </label>
                  <select
                    value={editingPattern.nivelMaturidade || 3}
                    onChange={(e) => setEditingPattern({ ...editingPattern, nivelMaturidade: parseInt(e.target.value, 10) })}
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={1}>Nível 1 — Evidência Isolada (1 RNC)</option>
                    <option value={2}>Nível 2 — Padrão Emergente (2 RNCs)</option>
                    <option value={3}>Nível 3 — Validado pelo Gestor SGQ</option>
                    <option value={4}>Nível 4 — Institucionalizado em POPs</option>
                    <option value={5}>Nível 5 — Padrão Corporativo SGQ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Status de Governança
                  </label>
                  <select
                    value={editingPattern.status || 'VALIDADO'}
                    onChange={(e) => setEditingPattern({ ...editingPattern, status: e.target.value as any })}
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PROPOSTO">Proposto</option>
                    <option value="VALIDADO">Validado</option>
                    <option value="PADRAO_SGQ">Padrão SGQ</option>
                    <option value="OBSOLETO">Obsoleto</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                >
                  Salvar Padrão SGQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
