import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Layers, 
  FileText, 
  Filter, 
  Hash, 
  BookOpen, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  Table,
  Copy,
  Check
} from 'lucide-react';
import { FragmentoDocumento } from '../../types/aiKnowledgeBase';

interface FragmentsExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentoId: string;
  codigoManual: string;
  revisaoManual: string;
}

export const FragmentsExplorerModal: React.FC<FragmentsExplorerModalProps> = ({
  isOpen,
  onClose,
  documentoId,
  codigoManual,
  revisaoManual,
}) => {
  const [fragments, setFragments] = useState<FragmentoDocumento[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subitemFilter, setSubitemFilter] = useState('');
  const [selectedCapitulo, setSelectedCapitulo] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !documentoId) return;

    const loadFragments = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.set('q', searchTerm);
        if (subitemFilter) queryParams.set('subitem', subitemFilter);
        if (selectedCapitulo) queryParams.set('capitulo', selectedCapitulo);
        queryParams.set('limite', '100');

        const response = await fetch(`/api/manuals/${encodeURIComponent(documentoId)}/fragments?${queryParams.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setFragments(data.fragmentos || []);
        } else {
          // Fallback via client repository query if backend docId doesn't match local session
          const fallbackResp = await fetch(`/api/manuals/tasks`);
          console.warn('Could not fetch fragments for docId:', documentoId);
        }
      } catch (err) {
        console.error('Error fetching manual fragments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFragments();
  }, [isOpen, documentoId, searchTerm, subitemFilter, selectedCapitulo]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Unique chapters for filter dropdown
  const capitulosUnicos = Array.from(new Set(fragments.map(f => f.capitulo))).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Explorador de Fragmentos Indexados</h3>
                <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30">
                  {codigoManual} ({revisaoManual})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualização detalhada dos fragmentos estruturados, contexto hierárquico e metadados preservados para IA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar texto nos fragmentos, procedimento ou responsabilidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Item (Ex: 3.4.3)"
              value={subitemFilter}
              onChange={(e) => setSubitemFilter(e.target.value)}
              className="w-28 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
            />

            {capitulosUnicos.length > 0 && (
              <select
                value={selectedCapitulo}
                onChange={(e) => setSelectedCapitulo(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="">Todos Capítulos</option>
                {capitulosUnicos.map((cap) => (
                  <option key={cap} value={cap}>Capítulo {cap}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Fragments List */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs bg-slate-50 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
            <span>Mostrando <strong>{fragments.length}</strong> fragmentos indexados</span>
            <span className="text-[11px] text-slate-400">Preserva hierarquia documental estrita</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Carregando fragmentos...</p>
            </div>
          ) : fragments.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">Nenhum fragmento encontrado com os filtros selecionados.</p>
              <p className="text-[11px] text-slate-400">Verifique os termos ou limpe o filtro de subitem.</p>
            </div>
          ) : (
            fragments.map((frag) => (
              <div
                key={frag.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all space-y-3"
              >
                {/* Fragment Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 font-mono font-bold text-indigo-700 text-xs">
                      Item {frag.itemCompleto}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Cap. {frag.capitulo} • Seção {frag.secao} {frag.subitem ? `• Subitem ${frag.subitem}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {frag.paginaOriginal && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                        Pág. {frag.paginaOriginal}
                      </span>
                    )}
                    <span className="text-slate-400">
                      Ordem: {frag.ordemFragmento}/{frag.totalFragmentosDocumento}
                    </span>
                    <span className="font-mono text-slate-400">
                      ~{frag.contagemTokensEstimada} tokens
                    </span>
                    <button
                      onClick={() => handleCopy(frag.id, frag.textoIntegral)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Copiar texto do fragmento"
                    >
                      {copiedId === frag.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Fragment Content */}
                <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line font-sans">
                  {frag.textoIntegral}
                </p>

                {/* Structured Tables if present */}
                {frag.tabelas && frag.tabelas.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Table className="w-3.5 h-3.5 text-indigo-600" />
                      Tabela Estruturada Preservada:
                    </span>
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed">
                      {frag.tabelas.map((t, idx) => (
                        <div key={idx} className="space-y-1">
                          {t.titulo && <div className="text-indigo-300 font-bold mb-1"># {t.titulo}</div>}
                          <pre>{t.conteudoMarkdown}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                  {frag.procedimentoRelacionado && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                      Procedimento: {frag.procedimentoRelacionado}
                    </span>
                  )}
                  {frag.responsabilidades && frag.responsabilidades.length > 0 && (
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                      Responsáveis: {frag.responsabilidades.join(', ')}
                    </span>
                  )}
                  {frag.controlesObrigatorios && frag.controlesObrigatorios.length > 0 && (
                    <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      Controles: {frag.controlesObrigatorios.join(', ')}
                    </span>
                  )}
                  <span className="text-slate-400 font-mono ml-auto">
                    Hash: {frag.hashConteudo.substring(0, 10)}...
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors"
          >
            Fechar Explorador
          </button>
        </div>
      </div>
    </div>
  );
};
