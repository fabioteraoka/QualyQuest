import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
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
  AlertTriangle,
  Scissors,
  Merge,
  Trash2,
  Edit2,
  Filter,
  Search,
  BookOpen,
} from 'lucide-react';
import { ExtracaoChecklistResultado } from '../../types/auditRequirements';

interface AuditImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  extracao: ExtracaoChecklistResultado | null;
  onConfirmImport: (dadosRevisados: ExtracaoChecklistResultado) => Promise<void>;
  loadingGravacao?: boolean;
}

export const AuditImportPreviewModal: React.FC<AuditImportPreviewModalProps> = ({
  isOpen,
  onClose,
  extracao,
  onConfirmImport,
  loadingGravacao = false,
}) => {
  if (!isOpen || !extracao) return null;

  const [itens, setItens] = useState(extracao.itens || []);
  const [selectedSecao, setSelectedSecao] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Campos de edição rápida do item ativo
  const [editNumero, setEditNumero] = useState<string>('');
  const [editSecao, setEditSecao] = useState<string>('');
  const [editTexto, setEditTexto] = useState<string>('');
  const [editRef, setEditRef] = useState<string>('');
  const [editCat, setEditCat] = useState<string>('');
  const [editCrit, setEditCrit] = useState<'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'>('ALTA');

  // Metadados da Auditoria
  const [metaCliente, setMetaCliente] = useState<string>(extracao.clienteDetectado || 'Kalitta Air');
  const [metaCodigo, setMetaCodigo] = useState<string>(extracao.codigoChecklist || 'FORM QA-14');
  const [metaRevisao, setMetaRevisao] = useState<string>(extracao.revisaoChecklist || 'QA 14 REV: 4');

  // Lista única de seções
  const secoesDisponiveis = Array.from(new Set(itens.map((it) => it.capituloOuSecao || 'Geral')));

  // Iniciar edição de item
  const handleStartEdit = (item: (typeof itens)[0]) => {
    setEditingItemId(item.tempId);
    setEditNumero(item.numeroItem);
    setEditSecao(item.capituloOuSecao);
    setEditTexto(item.textoOriginal);
    setEditRef(item.referenciaNormativa || '');
    setEditCat(item.categoriaSugerida || 'Geral');
    setEditCrit(item.criticidadeSugerida || 'ALTA');
  };

  // Salvar edição de item
  const handleSaveItemEdit = () => {
    if (!editingItemId) return;
    setItens((prev) =>
      prev.map((it) =>
        it.tempId === editingItemId
          ? {
              ...it,
              numeroItem: editNumero,
              capituloOuSecao: editSecao,
              textoOriginal: editTexto,
              perguntaOuCriterio: editTexto,
              referenciaNormativa: editRef,
              categoriaSugerida: editCat,
              criticidadeSugerida: editCrit,
              necessitaRevisaoHumana: false,
            }
          : it
      )
    );
    setEditingItemId(null);
  };

  // Excluir item do rascunho de importação
  const handleDeleteItem = (tempId: string) => {
    setItens((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  // Dividir item em dois (Split)
  const handleSplitItem = (tempId: string) => {
    const idx = itens.findIndex((it) => it.tempId === tempId);
    if (idx === -1) return;
    const original = itens[idx];
    const meio = Math.floor(original.textoOriginal.length / 2);
    const parte1 = original.textoOriginal.slice(0, meio).trim();
    const parte2 = original.textoOriginal.slice(meio).trim();

    const novo1 = {
      ...original,
      numeroItem: `${original.numeroItem}a`,
      textoOriginal: parte1,
      perguntaOuCriterio: parte1,
    };
    const novo2 = {
      ...original,
      tempId: `SPLIT-${Date.now()}`,
      numeroItem: `${original.numeroItem}b`,
      textoOriginal: parte2,
      perguntaOuCriterio: parte2,
    };

    const novos = [...itens];
    novos.splice(idx, 1, novo1, novo2);
    setItens(novos);
  };

  // Unir com o item anterior (Merge)
  const handleMergeWithPrevious = (idx: number) => {
    if (idx <= 0) return;
    const anterior = itens[idx - 1];
    const atual = itens[idx];

    const unificado = {
      ...anterior,
      textoOriginal: `${anterior.textoOriginal} ${atual.textoOriginal}`,
      perguntaOuCriterio: `${anterior.textoOriginal} ${atual.textoOriginal}`,
    };

    const novos = [...itens];
    novos.splice(idx - 1, 2, unificado);
    setItens(novos);
  };

  // Filtragem
  const filteredItens = itens.filter((it) => {
    const matchSecao = selectedSecao === 'TODAS' || it.capituloOuSecao === selectedSecao;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      it.numeroItem.toLowerCase().includes(term) ||
      it.textoOriginal.toLowerCase().includes(term) ||
      (it.referenciaNormativa && it.referenciaNormativa.toLowerCase().includes(term));
    return matchSecao && matchSearch;
  });

  // Estatísticas da revisão
  const totalItens = itens.length;
  const itensComAlerta = itens.filter((it) => it.necessitaRevisaoHumana).length;
  const itensProntos = totalItens - itensComAlerta;

  const handleConfirm = async () => {
    const revisado: ExtracaoChecklistResultado = {
      ...extracao,
      clienteDetectado: metaCliente,
      codigoChecklist: metaCodigo,
      revisaoChecklist: metaRevisao,
      totalItensIdentificados: totalItens,
      itens,
    };
    await onConfirmImport(revisado);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500 text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Extração Estruturada Item a Item
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {extracao.nomeArquivo}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {totalItens} Requisitos Extraídos
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              Pré-Visualização & Revisão de Itens do Checklist
            </h3>
            <p className="text-xs text-slate-400">
              Revise e ajuste as perguntas, números, hierarquias e referências antes de gravar oficialmente no QualiGest SGQ.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={loadingGravacao}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadados da Auditoria (Editáveis) */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cliente / Autoridade:</label>
            <input
              type="text"
              value={metaCliente}
              onChange={(e) => setMetaCliente(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Código do Formulário / Checklist:</label>
            <input
              type="text"
              value={metaCodigo}
              onChange={(e) => setMetaCodigo(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Revisão e Data de Vigência:</label>
            <input
              type="text"
              value={metaRevisao}
              onChange={(e) => setMetaRevisao(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por número, pergunta ou referência normativa..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSecao}
                onChange={(e) => setSelectedSecao(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="TODAS">Todas as Seções ({totalItens})</option>
                {secoesDisponiveis.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec} ({itens.filter((i) => i.capituloOuSecao === sec).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Indicadores de Revisão */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {itensProntos} Prontos
            </span>
            {itensComAlerta > 0 && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {itensComAlerta} Requerem Revisão
              </span>
            )}
          </div>
        </div>

        {/* Lista de Itens para Revisão */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filteredItens.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              Nenhum requisito encontrado para os filtros selecionados.
            </div>
          ) : (
            filteredItens.map((item, idx) => {
              const isEditing = editingItemId === item.tempId;

              if (isEditing) {
                return (
                  <div
                    key={item.tempId}
                    className="bg-white p-4 rounded-xl border-2 border-purple-500 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-purple-700">Editando Requisito #{item.numeroItem}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveItemEdit}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar Ajuste</span>
                        </button>
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Nº do Item:</label>
                        <input
                          type="text"
                          value={editNumero}
                          onChange={(e) => setEditNumero(e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1 font-mono font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500">Seção / Capítulo:</label>
                        <input
                          type="text"
                          value={editSecao}
                          onChange={(e) => setEditSecao(e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Criticidade:</label>
                        <select
                          value={editCrit}
                          onChange={(e) => setEditCrit(e.target.value as any)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-semibold"
                        >
                          <option value="CRITICA">CRÍTICA</option>
                          <option value="ALTA">ALTA</option>
                          <option value="MEDIA">MÉDIA</option>
                          <option value="BAIXA">BAIXA</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Texto Integral da Pergunta / Requisito:</label>
                      <textarea
                        value={editTexto}
                        onChange={(e) => setEditTexto(e.target.value)}
                        rows={3}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Referência Normativa / Procedimento:</label>
                      <input
                        type="text"
                        value={editRef}
                        onChange={(e) => setEditRef(e.target.value)}
                        placeholder="Ex: GMM 7.8, 14 CFR 43.13, 14 CFR 145.209"
                        className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.tempId}
                  className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                        Item {item.numeroItem}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {item.capituloOuSecao}
                      </span>
                      {item.paginaOrigem && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Pág. {item.paginaOrigem}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        item.criticidadeSugerida === 'CRITICA'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.criticidadeSugerida}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {item.categoriaSugerida}
                      </span>
                    </div>

                    {/* Ações do Item */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                        title="Editar Requisito"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSplitItem(item.tempId)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Dividir este item em dois (Split)"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                      </button>
                      {idx > 0 && (
                        <button
                          onClick={() => handleMergeWithPrevious(idx)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Unir com o item anterior (Merge)"
                        >
                          <Merge className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteItem(item.tempId)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Remover do rascunho de importação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Texto do Requisito */}
                  <p className="text-slate-800 font-medium text-xs leading-relaxed">
                    {item.textoOriginal}
                  </p>

                  {/* Rodapé do Item com Referências */}
                  {item.referenciaNormativa && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ref. Normativa: <strong>{item.referenciaNormativa}</strong></span>
                      {item.campoRespostaOriginal && (
                        <span className="text-slate-400">| Campo original: {item.campoRespostaOriginal}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé de Ações Finais */}
        <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Serão criadas <strong>1 Auditoria Oficial</strong> ({metaCliente} - {metaCodigo}) e <strong>{totalItens} unidades de requisitos individuais</strong> rastreáveis.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={loadingGravacao}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Rejeitar / Descartar
            </button>

            <button
              onClick={handleConfirm}
              disabled={loadingGravacao || totalItens === 0}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loadingGravacao ? 'Gravando no Firestore...' : `Confirmar Importação de ${totalItens} Requisitos`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
