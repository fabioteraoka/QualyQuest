import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import {
  TemplateMapeamentoAprovado,
  TipoControleImportacao,
  UserProfile
} from '../../types';
import { ESQUEMA_CAMPOS_CONTROLE } from '../../utils/smartImportEngine';

interface TemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Partial<TemplateMapeamentoAprovado> | null;
  organizationId: string;
  user: UserProfile | null;
  onSave: (template: TemplateMapeamentoAprovado) => Promise<void>;
}

export const TemplateEditModal: React.FC<TemplateEditModalProps> = ({
  isOpen,
  onClose,
  template,
  organizationId,
  user,
  onSave,
}) => {
  const [nome, setNome] = useState('');
  const [tipoControle, setTipoControle] = useState<TipoControleImportacao>('CALIBRACAO_FERRAMENTAL');
  const [mapeamentos, setMapeamentos] = useState<Record<string, string>>({});
  const [novaColunaPlanilha, setNovaColunaPlanilha] = useState('');
  const [novoCampoQualigest, setNovoCampoQualigest] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setNome(template.nomeTemplate || template.nome || '');
      setTipoControle(template.tipoControle || 'CALIBRACAO_FERRAMENTAL');
      setMapeamentos(template.mapeamentos ? { ...template.mapeamentos } : {});
    } else {
      setNome('');
      setTipoControle('CALIBRACAO_FERRAMENTAL');
      setMapeamentos({});
    }
    setNovaColunaPlanilha('');
    setNovoCampoQualigest('');
    setErro(null);
  }, [template, isOpen]);

  if (!isOpen) return null;

  const camposDisponiveis = ESQUEMA_CAMPOS_CONTROLE[tipoControle] || [];

  const handleRemoverMapeamento = (colunaOrigem: string) => {
    const novos = { ...mapeamentos };
    delete novos[colunaOrigem];
    setMapeamentos(novos);
  };

  const handleAlterarCampoDestino = (colunaOrigem: string, novoCampo: string) => {
    setMapeamentos({
      ...mapeamentos,
      [colunaOrigem]: novoCampo,
    });
  };

  const handleAdicionarMapeamento = (e: React.FormEvent) => {
    e.preventDefault();
    const colTrim = novaColunaPlanilha.trim();
    if (!colTrim) {
      setErro('Informe o nome da coluna presente na sua planilha.');
      return;
    }
    if (!novoCampoQualigest) {
      setErro('Selecione o campo do QualiGest correspondente.');
      return;
    }

    setMapeamentos({
      ...mapeamentos,
      [colTrim]: novoCampoQualigest,
    });
    setNovaColunaPlanilha('');
    setNovoCampoQualigest('');
    setErro(null);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe um nome descritivo para este modelo homologado.');
      return;
    }

    const colunas = Object.keys(mapeamentos);
    if (colunas.length === 0) {
      setErro('Adicione ao menos uma coluna mapeada neste modelo.');
      return;
    }

    setSalvando(true);
    setErro(null);

    const templateId = template?.id || `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const templateFinal: TemplateMapeamentoAprovado = {
      id: templateId,
      organizationId,
      nomeTemplate: nome.trim(),
      nome: nome.trim(),
      tipoControle,
      colunasDetectadas: colunas,
      mapeamentos,
      criadoPor: template?.criadoPor || user?.displayName || user?.email || 'SGQ',
      criadoPorNome: template?.criadoPorNome || user?.displayName || user?.email || 'SGQ',
      criadoPorUid: template?.criadoPorUid || user?.uid || 'sgq',
      dataAprovacao: template?.dataAprovacao || now,
      criadoEm: template?.criadoEm || now,
      atualizadoEm: now,
      totalVezesUsado: template?.totalVezesUsado || 0,
      vezesUtilizado: template?.vezesUtilizado || 0,
    };

    try {
      await onSave(templateFinal);
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar modelo de mapeamento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {template?.id ? 'Editar Modelo Homologado' : 'Novo Modelo de Mapeamento'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure como as colunas da planilha são mapeadas nos campos oficiais do QualiGest
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={salvando}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                Nome do Modelo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Planilha de Calibração Hangar Recife"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-medium text-xs focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                Módulo / Tipo de Controle <span className="text-rose-500">*</span>
              </label>
              <select
                value={tipoControle}
                onChange={(e) => {
                  setTipoControle(e.target.value as TipoControleImportacao);
                  setMapeamentos({});
                }}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold text-xs bg-slate-50 focus:outline-blue-500"
              >
                <option value="CALIBRACAO_FERRAMENTAL">Ferramentas & Metrologia (RBAC 145.109)</option>
                <option value="PESSOAS_COMPETENCIAS">Pessoas, Treinamentos & CHTs</option>
                <option value="CONTROLE_DOCUMENTAL">Controle Documental & Manuais</option>
                <option value="AUDITORIAS_QUALIDADE">Auditorias & Constatações</option>
              </select>
            </div>
          </div>

          {/* Lista de Mapeamentos */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Correspondência de Colunas ({Object.keys(mapeamentos).length} colunas mapeadas)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Quando uma planilha tiver essas colunas, o sistema vinculará aos campos indicados.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-xs">Cabeçalho na Planilha</th>
                    <th className="p-2.5 text-xs">Campo Destino no QualiGest</th>
                    <th className="p-2.5 text-xs text-center w-16">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {Object.keys(mapeamentos).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-400">
                        Nenhuma coluna configurada ainda. Adicione abaixo os nomes das colunas da sua planilha.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(mapeamentos).map(([colunaOrigem, campoQualigest]) => (
                      <tr key={colunaOrigem} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-900 font-bold">{colunaOrigem}</td>
                        <td className="p-2.5">
                          <select
                            value={campoQualigest}
                            onChange={(e) => handleAlterarCampoDestino(colunaOrigem, e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white font-medium focus:outline-blue-500"
                          >
                            <option value="IGNORAR">-- IGNORAR ESTA COLUNA --</option>
                            {camposDisponiveis.map((c) => (
                              <option key={c.campo} value={c.campo}>
                                {c.label} {c.obrigatorio ? '(*)' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoverMapeamento(colunaOrigem)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remover mapeamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Adicionar Novo Campo */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-800 text-[11px] block">
                + Adicionar Nova Coluna da Planilha ao Modelo:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    placeholder="Nome exato ou similar da coluna na planilha (ex: DATA_CALIB, TAG)"
                    value={novaColunaPlanilha}
                    onChange={(e) => setNovaColunaPlanilha(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono bg-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={novoCampoQualigest}
                    onChange={(e) => setNovoCampoQualigest(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
                  >
                    <option value="">Selecione o campo...</option>
                    <option value="IGNORAR">-- IGNORAR ESTA COLUNA --</option>
                    {camposDisponiveis.map((c) => (
                      <option key={c.campo} value={c.campo}>
                        {c.label} {c.obrigatorio ? '(*)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAdicionarMapeamento}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé interno */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{salvando ? 'Salvando...' : 'Salvar Modelo Homologado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
