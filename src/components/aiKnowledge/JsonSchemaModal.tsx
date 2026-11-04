import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { obterExemploSchemaJSONValido, ESQUEMA_JSON_IMPORTACAO_OFICIAL } from '../../services/aiKnowledge/jsonSchemaValidator';

interface JsonSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JsonSchemaModal: React.FC<JsonSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const exemploJSON = JSON.stringify(obterExemploSchemaJSONValido(), null, 2);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exemploJSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([exemploJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_manual_impacto.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Schema Oficial de Importação JSON
                <span className="text-[10px] font-mono bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                  v{ESQUEMA_JSON_IMPORTACAO_OFICIAL.versao}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Padrão estruturado de manuais técnicos com preservação de capítulos, seções, subitens e tabelas
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 bg-slate-50 flex-1">
          {/* Rules and Explanation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Diretrizes de Preenchimento Obrigatórias
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-800">documento (Cabeçalho):</span>
                <p className="text-slate-500">
                  Contém <code className="text-indigo-600 font-mono font-bold">codigo</code> (Ex: MOMQ), <code className="text-indigo-600 font-mono font-bold">nome</code>, <code className="text-indigo-600 font-mono font-bold">revisao</code> (Ex: 14) e <code className="text-indigo-600 font-mono font-bold">idioma</code>.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-800">secoes[] (Hierarquia):</span>
                <p className="text-slate-500">
                  Cada seção deve informar <code className="text-indigo-600 font-mono font-bold">capitulo</code>, <code className="text-indigo-600 font-mono font-bold">secao</code>, <code className="text-indigo-600 font-mono font-bold">subitem</code>, <code className="text-indigo-600 font-mono font-bold">pagina</code> e <code className="text-indigo-600 font-mono font-bold">conteudo</code> integral.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-800">tabelas[] (Estrutura):</span>
                <p className="text-slate-500">
                  Tabelas preservam colunas e linhas que são automaticamente convertidas para Markdown pela IA sem perda semântica.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-800">Controle de Versão:</span>
                <p className="text-slate-500">
                  Importar uma nova revisão (ex: Rev. 15) inativa logicamente a revisão anterior no acervo de IA preservando histórico.
                </p>
              </div>
            </div>
          </div>

          {/* Example JSON viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">Exemplo Canônico Válido:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-colors shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo .json</span>
                </button>
              </div>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed border border-slate-800 max-h-80">
              {exemploJSON}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
