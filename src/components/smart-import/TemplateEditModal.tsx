import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  FolderPlus
} from 'lucide-react';
import {
  TemplateMapeamentoAprovado,
  TipoControleImportacao,
  UserProfile
} from '../../types';
import {
  ESQUEMA_CAMPOS_CONTROLE,
  DefinicaoCampoQualigest,
  criarCampoPersonalizado,
  obterCamposCompletos,
} from '../../utils/smartImportEngine';

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
  const [camposPersonalizados, setCamposPersonalizados] = useState<DefinicaoCampoQualigest[]>([]);
  
  // Estados para nova coluna
  const [novaColunaPlanilha, setNovaColunaPlanilha] = useState('');
  const [novoCampoQualigest, setNovoCampoQualigest] = useState('__AUTO_CRIAR__');
  const [customFieldNameInput, setCustomFieldNameInput] = useState('');
  const [mostrarInputCampoManual, setMostrarInputCampoManual] = useState(false);
  
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setNome(template.nomeTemplate || template.nome || '');
      const tControle = template.tipoControle || 'CALIBRACAO_FERRAMENTAL';
      setTipoControle(tControle);
      const maps = template.mapeamentos ? { ...template.mapeamentos } : {};
      setMapeamentos(maps);

      // Recupera campos personalizados já salvos ou detecta nas chaves de mapeamento
      const padroes = new Set((ESQUEMA_CAMPOS_CONTROLE[tControle] || []).map((p) => p.campo));
      const customIniciais: DefinicaoCampoQualigest[] = [
        ...(template.camposPersonalizados || template.camposCustomizados || []),
      ].map((c: any) => ({
        campo: String(c.campo),
        label: String(c.label || c.campo),
        tipo: (c.tipo || 'string') as any,
        obrigatorio: Boolean(c.obrigatorio),
        sinonimos: c.sinonimos || [String(c.label || c.campo).toLowerCase()],
        descricao: c.descricao || `Campo personalizado ${c.label || c.campo}`,
        isCustom: true,
      }));

      // Se houver algum mapeamento que não está nos padrões e não está na lista custom, registra
      Object.entries(maps).forEach(([colOrigem, campoAlvo]) => {
        const campoStr = String(campoAlvo || '');
        if (
          campoStr &&
          campoStr !== 'IGNORAR' &&
          campoStr !== 'ignorar' &&
          !padroes.has(campoStr) &&
          !customIniciais.some((c) => c.campo === campoStr)
        ) {
          customIniciais.push({
            campo: campoStr,
            label: colOrigem || campoStr,
            tipo: 'string',
            obrigatorio: false,
            sinonimos: [colOrigem.toLowerCase()],
            descricao: `Campo personalizado para "${colOrigem}"`,
            isCustom: true,
          });
        }
      });

      setCamposPersonalizados(customIniciais);
    } else {
      setNome('');
      setTipoControle('CALIBRACAO_FERRAMENTAL');
      setMapeamentos({});
      setCamposPersonalizados([]);
    }
    setNovaColunaPlanilha('');
    setNovoCampoQualigest('__AUTO_CRIAR__');
    setCustomFieldNameInput('');
    setMostrarInputCampoManual(false);
    setErro(null);
    setSucessoMsg(null);
  }, [template, isOpen]);

  const camposPadrao = ESQUEMA_CAMPOS_CONTROLE[tipoControle] || [];
  const todosOsCampos = useMemo(() => {
    return obterCamposCompletos(tipoControle, camposPersonalizados);
  }, [tipoControle, camposPersonalizados]);

  if (!isOpen) return null;

  const handleRemoverMapeamento = (colunaOrigem: string) => {
    const novos = { ...mapeamentos };
    delete novos[colunaOrigem];
    setMapeamentos(novos);
  };

  const handleAlterarCampoDestino = (colunaOrigem: string, valorEscolhido: string) => {
    if (valorEscolhido === `__CRIAR_${colunaOrigem}`) {
      // Cria novo campo com o mesmo nome da coluna
      const novoDef = criarCampoPersonalizado(colunaOrigem);
      // Evita duplicata de slug
      let slug = novoDef.campo;
      let counter = 1;
      while (todosOsCampos.some((c) => c.campo === slug)) {
        slug = `${novoDef.campo}_${counter++}`;
      }
      novoDef.campo = slug;

      setCamposPersonalizados((prev) => [...prev.filter((c) => c.campo !== slug), novoDef]);
      setMapeamentos((prev) => ({ ...prev, [colunaOrigem]: slug }));
      setSucessoMsg(`Novo campo "${novoDef.label}" criado no QualiGest para a coluna "${colunaOrigem}"!`);
      setTimeout(() => setSucessoMsg(null), 3500);
      return;
    }

    if (valorEscolhido === '__NOVO_CUSTOM__') {
      const nomeDigitado = window.prompt(`Digite o nome do novo campo para a coluna "${colunaOrigem}":`, colunaOrigem);
      if (nomeDigitado && nomeDigitado.trim()) {
        const novoDef = criarCampoPersonalizado(nomeDigitado.trim());
        let slug = novoDef.campo;
        let counter = 1;
        while (todosOsCampos.some((c) => c.campo === slug)) {
          slug = `${novoDef.campo}_${counter++}`;
        }
        novoDef.campo = slug;

        setCamposPersonalizados((prev) => [...prev, novoDef]);
        setMapeamentos((prev) => ({ ...prev, [colunaOrigem]: slug }));
        setSucessoMsg(`Campo personalizado "${novoDef.label}" criado com sucesso!`);
        setTimeout(() => setSucessoMsg(null), 3500);
      }
      return;
    }

    setMapeamentos({
      ...mapeamentos,
      [colunaOrigem]: valorEscolhido,
    });
  };

  // Cria campo personalizado exclusivo para uma coluna específica
  const handleCriarCampoParaColuna = (colunaOrigem: string) => {
    const novoDef = criarCampoPersonalizado(colunaOrigem);
    let slug = novoDef.campo;
    let counter = 1;
    while (todosOsCampos.some((c) => c.campo === slug)) {
      slug = `${novoDef.campo}_${counter++}`;
    }
    novoDef.campo = slug;

    setCamposPersonalizados((prev) => [...prev.filter((c) => c.campo !== slug), novoDef]);
    setMapeamentos((prev) => ({ ...prev, [colunaOrigem]: slug }));
    setSucessoMsg(`Campo personalizado "${novoDef.label}" criado no QualiGest para a coluna "${colunaOrigem}"!`);
    setTimeout(() => setSucessoMsg(null), 3500);
  };

  // Botão Mágico: Espelhar todas as colunas como novos campos no QualiGest
  const handleEspelharTodasColunas = (forcarTodas: boolean = true) => {
    const colunasAtuais = Object.keys(mapeamentos);
    if (colunasAtuais.length === 0) {
      setErro('Nenhuma coluna adicionada ainda. Adicione as colunas da sua planilha abaixo.');
      return;
    }

    const novosCampos = [...camposPersonalizados];
    const novosMapeamentos = { ...mapeamentos };
    let criados = 0;

    colunasAtuais.forEach((col) => {
      const campoAtual = mapeamentos[col];
      // Se forçarTodas for true, recria campos com o nome da coluna para todas
      if (forcarTodas || !campoAtual || campoAtual === 'IGNORAR' || campoAtual === 'ignorar') {
        const def = criarCampoPersonalizado(col);
        let slug = def.campo;
        let counter = 1;
        while (novosCampos.some((c) => c.campo === slug) || camposPadrao.some((p) => p.campo === slug)) {
          slug = `${def.campo}_${counter++}`;
        }
        def.campo = slug;
        if (!novosCampos.some((c) => c.campo === slug)) {
          novosCampos.push(def);
        }
        novosMapeamentos[col] = slug;
        criados++;
      }
    });

    setCamposPersonalizados(novosCampos);
    setMapeamentos(novosMapeamentos);
    setSucessoMsg(`Sucesso! ${criados} campo(s) criado(s) com os mesmos nomes das colunas da planilha.`);
    setTimeout(() => setSucessoMsg(null), 4000);
  };

  const handleAdicionarMapeamento = (e: React.FormEvent) => {
    e.preventDefault();
    const colTrim = novaColunaPlanilha.trim();
    if (!colTrim) {
      setErro('Informe o nome da coluna presente na sua planilha.');
      return;
    }

    let campoDestinoFinal = novoCampoQualigest;

    // Se a opção for criar automaticamente com o mesmo nome
    if (novoCampoQualigest === '__AUTO_CRIAR__') {
      const novoDef = criarCampoPersonalizado(colTrim);
      let slug = novoDef.campo;
      let counter = 1;
      while (todosOsCampos.some((c) => c.campo === slug)) {
        slug = `${novoDef.campo}_${counter++}`;
      }
      novoDef.campo = slug;
      setCamposPersonalizados((prev) => [...prev, novoDef]);
      campoDestinoFinal = slug;
      setSucessoMsg(`Campo personalizado "${novoDef.label}" criado no QualiGest para a coluna "${colTrim}"!`);
      setTimeout(() => setSucessoMsg(null), 3500);
    } else if (novoCampoQualigest === '__DIGITAR_MANUAL__') {
      const labelManual = customFieldNameInput.trim() || colTrim;
      const novoDef = criarCampoPersonalizado(labelManual);
      let slug = novoDef.campo;
      let counter = 1;
      while (todosOsCampos.some((c) => c.campo === slug)) {
        slug = `${novoDef.campo}_${counter++}`;
      }
      novoDef.campo = slug;
      setCamposPersonalizados((prev) => [...prev, novoDef]);
      campoDestinoFinal = slug;
      setSucessoMsg(`Campo personalizado "${novoDef.label}" criado no QualiGest!`);
      setTimeout(() => setSucessoMsg(null), 3500);
    }

    setMapeamentos({
      ...mapeamentos,
      [colTrim]: campoDestinoFinal,
    });
    setNovaColunaPlanilha('');
    setNovoCampoQualigest('__AUTO_CRIAR__');
    setCustomFieldNameInput('');
    setMostrarInputCampoManual(false);
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
      camposPersonalizados,
      camposCustomizados: camposPersonalizados,
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {template?.id ? 'Editar Modelo Homologado' : 'Novo Modelo de Mapeamento'}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900 text-blue-200 border border-blue-700">
                  Campos Personalizáveis
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Você pode usar os campos padrão ou criar novos campos idênticos às colunas da sua planilha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={salvando}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {sucessoMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucessoMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                Nome do Modelo Homologado <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Planilha de Manuais e Controle do Hangar"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-medium text-xs focus:outline-blue-500 bg-white"
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
                }}
                className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold text-xs bg-slate-50 focus:outline-blue-500 cursor-pointer"
              >
                <option value="CONTROLE_DOCUMENTAL">Controle Documental & Manuais (RBAC 145.109)</option>
                <option value="CALIBRACAO_FERRAMENTAL">Ferramentas & Metrologia (RBAC 145.109)</option>
                <option value="PESSOAS_COMPETENCIAS">Pessoas, Treinamentos & CHTs</option>
                <option value="AUDITORIAS_QUALIDADE">Auditorias & Constatações</option>
              </select>
            </div>
          </div>

          {/* Barra de Ação Inteligente: Espelhar Colunas da Planilha */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Criar Campos do QualiGest Iguais às Colunas da Planilha:
              </span>
              <p className="text-[11px] text-blue-800">
                O QualiGest não limita você aos campos pré-determinados. Clique abaixo para gerar campos novos idênticos às colunas da sua planilha.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleEspelharTodasColunas(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                title="Cria automaticamente um campo novo para TODAS as colunas com os mesmos nomes"
              >
                <Sparkles className="w-4 h-4" />
                <span>Espelhar TODAS as Colunas</span>
              </button>
              <button
                type="button"
                onClick={() => handleEspelharTodasColunas(false)}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs transition shrink-0 cursor-pointer"
                title="Cria novos campos apenas para as colunas que estão sem campo ou marcadas para ignorar"
              >
                Apenas Não Mapeadas
              </button>
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
                  Cada coluna pode ser vinculada a um campo padrão do sistema ou ter um novo campo com o mesmo nome.
                </p>
              </div>

              {camposPersonalizados.length > 0 && (
                <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-full text-[11px] font-bold">
                  {camposPersonalizados.length} campo(s) personalizado(s)
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
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
                    Object.entries(mapeamentos).map(([colunaOrigem, campoQualigest]) => {
                      const isCustom = camposPersonalizados.some((c) => c.campo === campoQualigest);
                      const isIgnorado = campoQualigest === 'IGNORAR' || campoQualigest === 'ignorar';

                      return (
                        <tr key={colunaOrigem} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-900 font-bold">
                            {colunaOrigem}
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={campoQualigest}
                                onChange={(e) => handleAlterarCampoDestino(colunaOrigem, e.target.value)}
                                className={`flex-1 border rounded-lg p-1.5 text-xs font-semibold cursor-pointer ${
                                  isCustom
                                    ? 'border-purple-300 bg-purple-50 text-purple-950 font-bold'
                                    : isIgnorado
                                    ? 'border-slate-300 text-slate-400 bg-slate-50'
                                    : 'border-blue-300 text-slate-900 bg-white'
                                }`}
                              >
                                <option value={`__CRIAR_${colunaOrigem}`}>
                                  ✨ Criar Campo com Este Nome: "{colunaOrigem}"
                                </option>
                                <option value="__NOVO_CUSTOM__">
                                  ➕ Digitar Outro Campo Personalizado...
                                </option>
                                <option value="IGNORAR">-- IGNORAR ESTA COLUNA --</option>

                                {camposPersonalizados.length > 0 && (
                                  <optgroup label={`Campos Personalizados Criados (${camposPersonalizados.length})`}>
                                    {camposPersonalizados.map((c) => (
                                      <option key={c.campo} value={c.campo}>
                                        ★ {c.label} (Personalizado)
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                <optgroup label={`Campos Padrão do QualiGest (${camposPadrao.length})`}>
                                  {camposPadrao.map((c) => (
                                    <option key={c.campo} value={c.campo}>
                                      {c.label} {c.obrigatorio ? '(*)' : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>

                              {!isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleCriarCampoParaColuna(colunaOrigem)}
                                  className="px-2 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 transition shrink-0 cursor-pointer"
                                  title={`Criar imediatamente um campo novo no QualiGest para "${colunaOrigem}"`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                  <span className="hidden sm:inline">Criar campo</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoverMapeamento(colunaOrigem)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Remover mapeamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Adicionar Nova Coluna da Planilha e Criar Novo Campo */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] block">
                  + Adicionar Nova Coluna da Planilha ao Modelo:
                </span>
                <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Cria campo correspondente automaticamente
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Nome da coluna na planilha (ex: OBS_TECNICA, TAG_OFICINA, LOTE)"
                    value={novaColunaPlanilha}
                    onChange={(e) => setNovaColunaPlanilha(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono bg-white focus:outline-blue-500 font-bold"
                  />
                </div>
                <div className="sm:col-span-5">
                  <select
                    value={novoCampoQualigest}
                    onChange={(e) => {
                      setNovoCampoQualigest(e.target.value);
                      if (e.target.value === '__DIGITAR_MANUAL__') {
                        setMostrarInputCampoManual(true);
                      } else {
                        setMostrarInputCampoManual(false);
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white font-medium focus:outline-blue-500 cursor-pointer"
                  >
                    <option value="__AUTO_CRIAR__">
                      ✨ Criar novo campo no QualiGest com este mesmo nome
                    </option>
                    <option value="__DIGITAR_MANUAL__">
                      ➕ Digitar nome diferente para o campo...
                    </option>
                    <option value="IGNORAR">-- IGNORAR ESTA COLUNA --</option>
                    
                    {camposPersonalizados.length > 0 && (
                      <optgroup label="Campos Personalizados Existentes">
                        {camposPersonalizados.map((c) => (
                          <option key={c.campo} value={c.campo}>
                            ★ {c.label} (Personalizado)
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Campos Padrão do QualiGest">
                      {camposPadrao.map((c) => (
                        <option key={c.campo} value={c.campo}>
                          {c.label} {c.obrigatorio ? '(*)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAdicionarMapeamento}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {mostrarInputCampoManual && (
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">Nome do novo campo:</span>
                  <input
                    type="text"
                    placeholder="Digite o rótulo do campo no sistema..."
                    value={customFieldNameInput}
                    onChange={(e) => setCustomFieldNameInput(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg p-1.5 text-xs bg-white focus:outline-blue-500 font-semibold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rodapé interno */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
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
