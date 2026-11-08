import React, { useState, useMemo } from 'react';
import {
  Globe,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Lock,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  BookOpen,
  Layers,
  Sparkles,
  Eye,
  FileCheck2,
  FileCode,
  Building2,
  FileQuestion,
  ChevronRight,
  UploadCloud,
  Check,
  X,
  History
} from 'lucide-react';
import {
  MATRIZ_FONTES_MESTRA,
  FonteNormativaRegistro,
  ResultadoComparacaoRevisaoFonte,
  simularVerificacaoRevisaoFonte,
  getAmostrasRequisitosPesquisados,
  AmostraRequisitoPesquisado
} from '../../services/externalRequirementsMatrixService';
import { TipoAcessoFonte, StatusAcessoConteudo, RequisitoClienteItem } from '../../types';

interface RequirementsExternalSourcesMatrixTabProps {
  requisitosCadastrados: RequisitoClienteItem[];
  onOpenRequirementDetail?: (reqId: string) => void;
}

const TIPO_ACESSO_CONFIG: Record<
  TipoAcessoFonte,
  { label: string; badgeClass: string; icon: string; desc: string }
> = {
  PUBLICA_AUTOMATICA: {
    label: 'Pública (API / XML Oficial)',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: '⚡',
    desc: 'Fonte pública com consulta estruturada em formato aberto (ex: EASA eRules XML, eCFR FAA).'
  },
  PUBLICA_MANUAL: {
    label: 'Pública (Consulta Oficial Manual)',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: '🌐',
    desc: 'Portal oficial da autoridade com verificação direta de portarias/emendas (ex: ANAC Legislação).'
  },
  PRIVADA_LICENCIADA: {
    label: 'Privada (Exige Licença / Autoral)',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: '🔒',
    desc: 'Padrão proprietário com proteção de copyright (ex: IATA IOSA ISM). Acesso restrito a metadados.'
  },
  CLIENTE_ENVIO_PENDENTE: {
    label: 'Cliente (Depende de Envio Formal)',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: '📥',
    desc: 'Checklist específico do operador aéreo contratual. Depende de envio e protocolo formal do cliente.'
  },
  INTERNO_CONTROLADO: {
    label: 'Interno IMPACTO (SGQ Controlado)',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    icon: '🏢',
    desc: 'Documentação interna controlada pelo SGQ da IMPACTO (MOMQ, PTM, Formulários F 001).'
  }
};

const STATUS_ACESSO_CONFIG: Record<
  StatusAcessoConteudo,
  { label: string; badgeClass: string; icon: any }
> = {
  FONTE_IDENTIFICADA: {
    label: 'Fonte Identificada',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    icon: Eye
  },
  CONTEUDO_EXTRAIDO: {
    label: 'Conteúdo Extraído',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    icon: FileCheck2
  },
  PENDENTE_VALIDACAO: {
    label: 'Pendente Validação',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    icon: Clock
  },
  VALIDADO_QUALIDADE: {
    label: 'Validado pela Qualidade',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
    icon: CheckCircle2
  },
  DESATUALIZADO: {
    label: 'Desatualizado',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    icon: AlertTriangle
  },
  AGUARDANDO_DOCUMENTO: {
    label: 'Aguardando Documento',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
    icon: FileQuestion
  },
  AGUARDANDO_ACESSO_AUTORIZADO: {
    label: 'Acesso Autorizado Pendente',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    icon: Lock
  },
  SUSPENSO: {
    label: 'Suspenso',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    icon: AlertTriangle
  }
};

export const RequirementsExternalSourcesMatrixTab: React.FC<RequirementsExternalSourcesMatrixTabProps> = ({
  requisitosCadastrados
}) => {
  const [selectedFamilia, setSelectedFamilia] = useState<string>('TODAS');
  const [selectedTipoAcesso, setSelectedTipoAcesso] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFonteParaComparacao, setSelectedFonteParaComparacao] = useState<FonteNormativaRegistro | null>(null);
  const [resultadoComparacao, setResultadoComparacao] = useState<ResultadoComparacaoRevisaoFonte | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'matriz_fontes' | 'requisitos_extraidos'>('matriz_fontes');
  const [filtroOrigemRequisitos, setFiltroOrigemRequisitos] = useState<string>('TODOS');

  // Amostras de requisitos pesquisados
  const requisitosPesquisados = useMemo(() => getAmostrasRequisitosPesquisados(), []);

  // Filtro de fontes
  const fontesFiltradas = useMemo(() => {
    return MATRIZ_FONTES_MESTRA.filter((fonte) => {
      if (selectedFamilia !== 'TODAS' && fonte.familia !== selectedFamilia) return false;
      if (selectedTipoAcesso !== 'TODOS' && fonte.tipoAcesso !== selectedTipoAcesso) return false;
      if (searchTerm.trim()) {
        const termo = searchTerm.toLowerCase();
        const bateu =
          fonte.codigoDocumento.toLowerCase().includes(termo) ||
          fonte.tituloDocumento.toLowerCase().includes(termo) ||
          fonte.autoridadeOuEntidade.toLowerCase().includes(termo) ||
          fonte.revisaoVigenteIdentificada.toLowerCase().includes(termo);
        if (!bateu) return false;
      }
      return true;
    });
  }, [selectedFamilia, selectedTipoAcesso, searchTerm]);

  // Contadores e métricas de fontes
  const metricasFontes = useMemo(() => {
    let publicas = 0;
    let privadas = 0;
    let clientes = 0;
    let internas = 0;
    let aguardandoDoc = 0;

    MATRIZ_FONTES_MESTRA.forEach((f) => {
      if (f.tipoAcesso === 'PUBLICA_AUTOMATICA' || f.tipoAcesso === 'PUBLICA_MANUAL') publicas++;
      if (f.tipoAcesso === 'PRIVADA_LICENCIADA') privadas++;
      if (f.tipoAcesso === 'CLIENTE_ENVIO_PENDENTE') clientes++;
      if (f.tipoAcesso === 'INTERNO_CONTROLADO') internas++;
      if (f.statusAcesso === 'AGUARDANDO_DOCUMENTO' || f.statusAcesso === 'AGUARDANDO_ACESSO_AUTORIZADO') aguardandoDoc++;
    });

    return {
      total: MATRIZ_FONTES_MESTRA.length,
      publicas,
      privadas,
      clientes,
      internas,
      aguardandoDoc
    };
  }, []);

  // Executar simulação de verificação
  const handleVerificarFonte = (fonte: FonteNormativaRegistro) => {
    setSelectedFonteParaComparacao(fonte);
    setIsVerifying(true);
    setTimeout(() => {
      const res = simularVerificacaoRevisaoFonte(fonte.id);
      setResultadoComparacao(res);
      setIsVerifying(false);
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal de Governança e Rastreabilidade */}
      <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Matriz Central de Disponibilidade e Rastreabilidade de Fontes Aeronáuticas
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Fase 1.2
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-4xl">
                Controle institucional de fontes regulatórias públicas (ANAC, EASA, FAA), normas com acesso protegido (IOSA),
                checklists de clientes e publicações internas da IMPACTO. <span className="font-semibold text-amber-300">Regra de ouro:</span> tolerância zero para informações fictícias.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('matriz_fontes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'matriz_fontes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matriz de Fontes ({metricasFontes.total})</span>
            </button>
            <button
              onClick={() => setViewMode('requisitos_extraidos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'requisitos_extraidos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Requisitos Rastreáveis ({requisitosPesquisados.length})</span>
            </button>
          </div>
        </div>

        {/* Indicadores de Status das Fontes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-800">
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Fontes Públicas</span>
            <span className="text-base font-bold text-blue-400">{metricasFontes.publicas}</span>
            <span className="text-[9px] text-slate-500 block">ANAC, EASA, FAA</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Fontes Privadas</span>
            <span className="text-base font-bold text-purple-400">{metricasFontes.privadas}</span>
            <span className="text-[9px] text-slate-500 block">IATA IOSA ISM</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Checklists Clientes</span>
            <span className="text-base font-bold text-amber-400">{metricasFontes.clientes}</span>
            <span className="text-[9px] text-slate-500 block">Kalitta, Atlas, Avion, etc.</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Internos SGQ</span>
            <span className="text-base font-bold text-emerald-400">{metricasFontes.internas}</span>
            <span className="text-[9px] text-slate-500 block">MOMQ, PTM, F 001</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-amber-400 block font-medium">Pendentes de Documento</span>
            <span className="text-base font-bold text-amber-300">{metricasFontes.aguardandoDoc}</span>
            <span className="text-[9px] text-slate-500 block">SWISS, Avion, IOSA</span>
          </div>
        </div>
      </div>

      {/* VIEW: MATRIZ DE FONTES NORMATIVAS (TABELA EXIGIDA PELA SEÇÃO 7) */}
      {viewMode === 'matriz_fontes' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código (ex: RBAC 145, Part-145, QA-14), título ou órgão..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-0 focus:outline-hidden text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedFamilia}
                onChange={(e) => setSelectedFamilia(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODAS">Todas as Famílias</option>
                <option value="ANAC">ANAC (Brasil)</option>
                <option value="EASA">EASA (Europa)</option>
                <option value="FAA">FAA (EUA)</option>
                <option value="IOSA">IATA / IOSA</option>
                <option value="CLIENTE">Clientes Operadores</option>
                <option value="INTERNO_IMPACTO">Internos IMPACTO</option>
              </select>

              <select
                value={selectedTipoAcesso}
                onChange={(e) => setSelectedTipoAcesso(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODOS">Todos os Tipos de Acesso</option>
                <option value="PUBLICA_AUTOMATICA">Pública (API / XML)</option>
                <option value="PUBLICA_MANUAL">Pública (Manual)</option>
                <option value="PRIVADA_LICENCIADA">Privada Licenciada</option>
                <option value="CLIENTE_ENVIO_PENDENTE">Cliente (Envio Pendente)</option>
                <option value="INTERNO_CONTROLADO">Interno Controlado</option>
              </select>
            </div>
          </div>

          {/* Tabela de Fontes conforme Seção 7 */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Fonte / Autoridade</th>
                  <th className="py-3 px-3.5">Documento</th>
                  <th className="py-3 px-3.5">Tipo de Acesso</th>
                  <th className="py-3 px-3.5">Conteúdo Obtido</th>
                  <th className="py-3 px-3.5">Revisão Identificada</th>
                  <th className="py-3 px-3.5">Última Consulta</th>
                  <th className="py-3 px-3.5 text-center">Atualização Possível</th>
                  <th className="py-3 px-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {fontesFiltradas.map((fonte) => {
                  const cfgAcesso = TIPO_ACESSO_CONFIG[fonte.tipoAcesso];
                  const cfgStatus = STATUS_ACESSO_CONFIG[fonte.statusAcesso];
                  const StatusIcon = cfgStatus.icon;

                  return (
                    <tr
                      key={fonte.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Autoridade */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {fonte.autoridadeOuEntidade}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {fonte.familia}
                        </span>
                      </td>

                      {/* Documento */}
                      <td className="py-3 px-3.5 align-top max-w-[240px]">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {fonte.codigoDocumento}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate" title={fonte.tituloDocumento}>
                          {fonte.tituloDocumento}
                        </div>
                        {fonte.limitaAcesso && (
                          <div className="text-[10px] text-purple-700 dark:text-purple-300 mt-1 flex items-center gap-1 font-medium bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            <Lock className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{fonte.limitaAcesso}</span>
                          </div>
                        )}
                      </td>

                      {/* Tipo de Acesso */}
                      <td className="py-3 px-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfgAcesso.badgeClass}`}
                          title={cfgAcesso.desc}
                        >
                          <span>{cfgAcesso.icon}</span>
                          <span>{cfgAcesso.label}</span>
                        </span>
                      </td>

                      {/* Conteúdo Obtido / Status */}
                      <td className="py-3 px-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfgStatus.badgeClass}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{cfgStatus.label}</span>
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {fonte.totalItensExtraidos} itens catalogados
                          {fonte.totalEstimadoItens ? ` de ~${fonte.totalEstimadoItens}` : ''}
                        </div>
                      </td>

                      {/* Revisão Identificada */}
                      <td className="py-3 px-3.5 align-top max-w-[200px]">
                        <div className="font-medium text-slate-900 dark:text-slate-200 text-[11px]">
                          {fonte.revisaoVigenteIdentificada}
                        </div>
                        {fonte.dataVigencia && (
                          <span className="text-[10px] text-slate-500 block">
                            Vigência: {fonte.dataVigencia}
                          </span>
                        )}
                      </td>

                      {/* Última Consulta */}
                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                          {fonte.dataUltimaConsulta}
                        </div>
                        {fonte.urlOficialConsulta.startsWith('http') && (
                          <a
                            href={fonte.urlOficialConsulta}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                          >
                            <span>Link Oficial</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>

                      {/* Atualização Possível */}
                      <td className="py-3 px-3.5 align-top text-center">
                        {fonte.atualizacaoPossivel ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <Check className="w-3 h-3" />
                            <span>
                              {fonte.modalidadeAtualizacao === 'AUTOMATICA_API_XML'
                                ? 'Automática (XML)'
                                : 'Manual Guiada'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            <Lock className="w-3 h-3" />
                            <span>Upload / Licença</span>
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3.5 align-top text-right">
                        <button
                          onClick={() => handleVerificarFonte(fonte)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Verificar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: REQUISITOS EXTRAÍDOS E RASTREABILIDADE NORMATIVA */}
      {viewMode === 'requisitos_extraidos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Filtrar por Família Normativa:</span>
              <div className="flex flex-wrap gap-1">
                {['TODOS', 'REGULATORIO_ANAC', 'REGULATORIO_EASA', 'PADRAO_SETORIAL_IOSA', 'CONTRATUAL_CLIENTE', 'BOA_PRATICA_REFERENCIA'].map((origem) => (
                  <button
                    key={origem}
                    onClick={() => setFiltroOrigemRequisitos(origem)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      filtroOrigemRequisitos === origem
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {origem === 'TODOS'
                      ? 'Todos'
                      : origem === 'REGULATORIO_ANAC'
                      ? 'ANAC'
                      : origem === 'REGULATORIO_EASA'
                      ? 'EASA'
                      : origem === 'PADRAO_SETORIAL_IOSA'
                      ? 'IOSA (Setorial)'
                      : origem === 'CONTRATUAL_CLIENTE'
                      ? 'Clientes'
                      : 'FAA / Referência'}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-slate-500 text-[11px]">
              Exibindo {requisitosPesquisados.length} requisitos rastreados e verificados
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requisitosPesquisados
              .filter((r) => filtroOrigemRequisitos === 'TODOS' || r.fonteOrigem === filtroOrigemRequisitos)
              .map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {req.codigoReferenciaOriginal}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {req.entidadeEmissora} • {req.edicaoRevisaoFonte}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {req.tituloCurto}
                    </h4>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic font-serif leading-relaxed">
                      "{req.textoOriginal}"
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Capítulo / Subitem:</span> {req.capituloSecaoSubitem}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Justificativa de Aplicabilidade:</span> {req.justificativaAplicabilidade}
                      </div>
                      {req.controleCentralId && (
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Controle Central SGQ:</span>{' '}
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{req.controleCentralId}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Evidência Esperada:</span> {req.evidenciaEsperada}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      Consulta: {req.dataUltimaConsulta}
                    </span>
                    {req.urlOficialFonte && req.urlOficialFonte.startsWith('http') && (
                      <a
                        href={req.urlOficialFonte}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Fonte Oficial</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL DE COMPARAÇÃO DE REVISÃO E MECANISMO DE ATUALIZAÇÃO (FLUXO DOS 10 PASSOS) */}
      {selectedFonteParaComparacao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-5 h-5 text-blue-600 ${isVerifying ? 'animate-spin' : ''}`} />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Mecanismo de Comparação e Atualização de Revisão
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fluxo controlado de 10 etapas para consulta da fonte oficial, detecção de diferenças e aprovação humana.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedFonteParaComparacao(null);
                  setResultadoComparacao(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isVerifying ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Consultando fonte oficial: {selectedFonteParaComparacao.codigoDocumento}...
                </div>
                <p className="text-xs text-slate-500">
                  Conectando ao catálogo de publicações, extraindo metadados e comparando hashes de revisão.
                </p>
              </div>
            ) : resultadoComparacao ? (
              <div className="space-y-4 text-xs">
                {/* Resumo da Comparação */}
                <div
                  className={`p-3.5 rounded-xl border ${
                    resultadoComparacao.temDivergenciaRevisao
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {resultadoComparacao.temDivergenciaRevisao ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span className={resultadoComparacao.temDivergenciaRevisao ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-900 dark:text-emerald-200'}>
                      {resultadoComparacao.mensagemConclusiva}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px]">
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg">
                      <span className="text-slate-500 block">Revisão no QualyQuest:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{resultadoComparacao.revisaoAtualNoSistema}</span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg">
                      <span className="text-slate-500 block">Revisão na Fonte Oficial:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{resultadoComparacao.revisaoIdentificadaNaFonte}</span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg">
                      <span className="text-slate-500 block">Itens Novos Detectados:</span>
                      <span className="font-bold text-emerald-600">{resultadoComparacao.itensNovos.length}</span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg">
                      <span className="text-slate-500 block">Itens Alterados:</span>
                      <span className="font-bold text-amber-600">{resultadoComparacao.itensAlterados.length}</span>
                    </div>
                  </div>
                </div>

                {/* Itens Novos e Alterados Side-by-Side */}
                {resultadoComparacao.itensAlterados.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Diferenças de Redação Identificadas (Revisão Anterior vs. Nova):</span>
                    </h4>
                    {resultadoComparacao.itensAlterados.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                          <span>{item.codigoItem} — {item.titulo}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
                            Alteração Normativa
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] mt-1">
                          <div className="p-2 rounded bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                            <span className="font-semibold text-rose-800 dark:text-rose-300 block text-[10px]">Texto Anterior ({item.revisaoAnterior}):</span>
                            <p className="text-rose-900 dark:text-rose-200 italic mt-0.5">"{item.textoAnterior}"</p>
                          </div>
                          <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                            <span className="font-semibold text-emerald-800 dark:text-emerald-300 block text-[10px]">Novo Texto Oficial ({item.revisaoNova}):</span>
                            <p className="text-emerald-900 dark:text-emerald-200 italic mt-0.5">"{item.textoNovo}"</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                          <span className="font-semibold">Impacto SGQ Sugerido:</span> {item.impactoSugerido}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Itens Novos */}
                {resultadoComparacao.itensNovos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Novos Requisitos Incorporados na Revisão:</span>
                    </h4>
                    {resultadoComparacao.itensNovos.map((novo, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-[11px]">
                        <div className="font-bold text-emerald-900 dark:text-emerald-200">
                          {novo.codigoItem} — {novo.titulo}
                        </div>
                        <p className="text-emerald-800 dark:text-emerald-300 italic mt-1">
                          "{novo.textoNovo}"
                        </p>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                          <span className="font-semibold">Impacto:</span> {novo.impactoSugerido}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Regra de Governança Estrita */}
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-900 dark:text-blue-200">
                  <span className="font-bold block">Regra SGQ de Não-Alteração Retroativa:</span>
                  A aprovação desta atualização gerará uma nova versão rastreável na Biblioteca Central. Snapshots de auditorias concluídas anteriormente (Kalitta, Atlas, SWISS) permanecerão 100% inalterados com o texto normativo que vigia na época do evento.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedFonteParaComparacao(null);
                      setResultadoComparacao(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      alert('Simulação de aprovação humana concluída. O histórico rastreável foi registrado no SGQ e os requisitos foram versionados sem alterar snapshots anteriores.');
                      setSelectedFonteParaComparacao(null);
                      setResultadoComparacao(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Aprovar e Versionar Atualização
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
