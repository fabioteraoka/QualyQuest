import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Tag,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Info,
  ExternalLink,
  Layers,
  Edit3,
  Trash2,
  Download,
  FileCheck2,
  Sparkles,
  Lock,
  Globe,
  Sliders,
  Plane,
  DownloadCloud,
  FileSpreadsheet
} from 'lucide-react';
import {
  RequisitoClienteItem,
  TipoOrigemRequisito,
  SituacaoAplicabilidadeImpacto,
  AplicabilidadeContextualImpacto,
  HistoricoAlteracaoRequisitoItem,
  ClienteExterno,
  BaseEstacaoOperacao,
  ControleCentralSGQ,
  ProgramaChecklistCliente,
  UserProfile,
  OrganizationRecord
} from '../types';
import {
  saveRequisitoCliente,
  updateAplicabilidadeRequisitoMestre,
  deleteRequisitoCliente
} from '../services/firebase/clientRequirementsFirestore';
import { RequirementsDiagnosticTab } from './requirements/RequirementsDiagnosticTab';
import { RequirementsDataLoadTab } from './requirements/RequirementsDataLoadTab';
import { RequirementsCentralControlsMatrixTab } from './requirements/RequirementsCentralControlsMatrixTab';
import {
  executarDiagnosticoRequisitos
} from '../services/requirementsDataLoadService';

export interface RequirementsLibraryViewProps {
  requisitos: RequisitoClienteItem[];
  setRequisitos?: React.Dispatch<React.SetStateAction<RequisitoClienteItem[]>>;
  clientes: ClienteExterno[];
  bases: BaseEstacaoOperacao[];
  controles: ControleCentralSGQ[];
  programas: ProgramaChecklistCliente[];
  activeOrganization: OrganizationRecord | null;
  userProfile?: UserProfile | null;
  onNavigateToTab?: (tab: string) => void;
}

const ORIGEM_CONFIG: Record<
  TipoOrigemRequisito,
  { label: string; badgeClass: string; borderClass: string; icon: string; descricao: string }
> = {
  REGULATORIO_ANAC: {
    label: 'ANAC — RBAC 145',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    borderClass: 'border-blue-500 dark:border-blue-600',
    icon: '🏛️',
    descricao: 'Regulação Aeronáutica Primária Brasileira (ANAC)'
  },
  REGULATORIO_EASA: {
    label: 'EASA — Part-145',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800',
    borderClass: 'border-sky-500 dark:border-sky-600',
    icon: '🇪🇺',
    descricao: 'Regulação Aeronáutica Europeia para MRO Estrangeiro'
  },
  PADRAO_SETORIAL_IOSA: {
    label: 'IOSA — ISM MNT/ORG',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    borderClass: 'border-purple-500 dark:border-purple-600',
    icon: '✈️',
    descricao: 'Padrão Setorial IATA (Operadores Aéreos) — Exigível via escopo contratual'
  },
  CONTRATUAL_CLIENTE: {
    label: 'Cliente Operador',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-500 dark:border-amber-600',
    icon: '🤝',
    descricao: 'Requisito Contratual Específico do Cliente'
  },
  INTERNO_IMPACTO: {
    label: 'Interno IMPACTO',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-500 dark:border-emerald-600',
    icon: '🏢',
    descricao: 'Normas e Procedimentos Internos (MOMQ / MPO)'
  },
  BOA_PRATICA_REFERENCIA: {
    label: 'Boa Prática SGQ',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    borderClass: 'border-slate-500 dark:border-slate-600',
    icon: '💡',
    descricao: 'Recomendações e Benchmarks Técnicos da Indústria'
  }
};

const APLICABILIDADE_CONFIG: Record<
  SituacaoAplicabilidadeImpacto,
  { label: string; badgeClass: string; borderClass: string; icon: any }
> = {
  APLICAVEL: {
    label: 'Aplicável Integralmente',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-500',
    icon: CheckCircle2
  },
  PARCIALMENTE_APLICAVEL: {
    label: 'Parcialmente Aplicável',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-500',
    icon: AlertTriangle
  },
  NAO_APLICAVEL: {
    label: 'Não Aplicável',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    borderClass: 'border-slate-400',
    icon: X
  },
  AGUARDANDO_AVALIACAO: {
    label: 'Aguardando Avaliação',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    borderClass: 'border-indigo-500',
    icon: Clock
  }
};

export const RequirementsLibraryView: React.FC<RequirementsLibraryViewProps> = ({
  requisitos,
  setRequisitos,
  clientes,
  bases,
  controles,
  programas,
  activeOrganization,
  userProfile,
  onNavigateToTab
}) => {
  const orgId = activeOrganization?.id || userProfile?.organizationId || 'org_impacto_aviation';
  const isConsulta = userProfile?.role === 'CONSULTA' || userProfile?.role === 'VIEWER';

  // Sub-Navigation Tabs state (Acervo, Diagnóstico, Carga Segura, Matriz)
  const [activeLibraryTab, setActiveLibraryTab] = useState<'acervo' | 'diagnostico' | 'carga' | 'matriz'>('acervo');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFonte, setSelectedFonte] = useState<string>('TODAS');
  const [selectedAplicabilidade, setSelectedAplicabilidade] = useState<string>('TODAS');
  const [selectedCliente, setSelectedCliente] = useState<string>('TODOS');
  const [selectedCriticidade, setSelectedCriticidade] = useState<string>('TODAS');
  const [onlyIosa, setOnlyIosa] = useState(false);

  // Modals state
  const [selectedReqForHistory, setSelectedReqForHistory] = useState<RequisitoClienteItem | null>(null);
  const [selectedReqForApplicability, setSelectedReqForApplicability] = useState<RequisitoClienteItem | null>(null);
  const [selectedReqForEdit, setSelectedReqForEdit] = useState<RequisitoClienteItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diagnóstico em tempo real
  const diagnostico = useMemo(() => {
    return executarDiagnosticoRequisitos(requisitos, clientes, programas, controles);
  }, [requisitos, clientes, programas, controles]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = requisitos.length;
    const anac = requisitos.filter((r) => r.fonteOrigem === 'REGULATORIO_ANAC').length;
    const easa = requisitos.filter((r) => r.fonteOrigem === 'REGULATORIO_EASA').length;
    const iosa = requisitos.filter((r) => r.fonteOrigem === 'PADRAO_SETORIAL_IOSA' || r.isIosaSetorial).length;
    const cliente = requisitos.filter((r) => r.fonteOrigem === 'CONTRATUAL_CLIENTE').length;
    const interno = requisitos.filter((r) => r.fonteOrigem === 'INTERNO_IMPACTO').length;

    const aplicaveis = requisitos.filter(
      (r) => !r.aplicabilidadeContexto || r.aplicabilidadeContexto.situacao === 'APLICAVEL'
    ).length;
    const parciais = requisitos.filter(
      (r) => r.aplicabilidadeContexto?.situacao === 'PARCIALMENTE_APLICAVEL'
    ).length;
    const naoAplicaveis = requisitos.filter(
      (r) => r.aplicabilidadeContexto?.situacao === 'NAO_APLICAVEL'
    ).length;
    const pendentes = requisitos.filter(
      (r) => r.aplicabilidadeContexto?.situacao === 'AGUARDANDO_AVALIACAO'
    ).length;

    return { total, anac, easa, iosa, cliente, interno, aplicaveis, parciais, naoAplicaveis, pendentes };
  }, [requisitos]);

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requisitos.filter((req) => {
      // Search text
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = req.numeroItem.toLowerCase().includes(term);
        const matchTitle = (req.tituloCurto || '').toLowerCase().includes(term);
        const matchText = (req.textoOriginal || '').toLowerCase().includes(term);
        const matchRefOrig = (req.codigoReferenciaOriginal || '').toLowerCase().includes(term);
        const matchDoc = (req.fonteDocumentoNome || '').toLowerCase().includes(term);
        const matchCtrl = (req.controleCentralCodigo || '').toLowerCase().includes(term);
        const matchClient = (req.clienteNome || '').toLowerCase().includes(term);

        if (!matchCode && !matchTitle && !matchText && !matchRefOrig && !matchDoc && !matchCtrl && !matchClient) {
          return false;
        }
      }

      // Filter by source
      if (selectedFonte !== 'TODAS') {
        if (selectedFonte === 'PADRAO_SETORIAL_IOSA') {
          if (req.fonteOrigem !== 'PADRAO_SETORIAL_IOSA' && !req.isIosaSetorial) return false;
        } else if (req.fonteOrigem !== selectedFonte) {
          return false;
        }
      }

      // Quick IOSA toggle
      if (onlyIosa && req.fonteOrigem !== 'PADRAO_SETORIAL_IOSA' && !req.isIosaSetorial) {
        return false;
      }

      // Filter by applicability
      if (selectedAplicabilidade !== 'TODAS') {
        const sit = req.aplicabilidadeContexto?.situacao || 'APLICAVEL';
        if (sit !== selectedAplicabilidade) return false;
      }

      // Filter by client
      if (selectedCliente !== 'TODOS') {
        if (req.clienteId !== selectedCliente && req.clienteNome !== selectedCliente) {
          return false;
        }
      }

      // Filter by criticality
      if (selectedCriticidade !== 'TODAS') {
        if (req.criticidade !== selectedCriticidade) return false;
      }

      return true;
    });
  }, [requisitos, searchTerm, selectedFonte, onlyIosa, selectedAplicabilidade, selectedCliente, selectedCriticidade]);

  // Handlers
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredRequirements, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `qualyquest_requisitos_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDeleteItem = async (req: RequisitoClienteItem) => {
    if (isConsulta) {
      alert('Acesso restrito: Perfil de CONSULTA não pode excluir requisitos.');
      return;
    }
    const confirmDelete = window.confirm(
      `Deseja realmente remover o requisito "${req.numeroItem} - ${req.tituloCurto}" do cadastro mestre?`
    );
    if (!confirmDelete) return;

    try {
      setSavingStatus('Excluindo...');
      await deleteRequisitoCliente(orgId, req.id, userProfile);
      if (setRequisitos) {
        setRequisitos((prev) => prev.filter((r) => r.id !== req.id));
      }
      setSavingStatus(null);
    } catch (err: any) {
      console.error('Erro ao excluir requisito:', err);
      setErrorMessage(err.message || 'Falha ao excluir requisito.');
      setSavingStatus(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Page Title */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Biblioteca Central de Requisitos Multi-Fontes
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Fase 1 SGQ
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Repositório normativo mestre da IMPACTO: regulatório (ANAC, EASA), padrões setoriais (IOSA),
              especificações contratuais de clientes e manuais internos (MOMQ / MPO).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Exportar requisitos filtrados em formato JSON"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            {!isConsulta && (
              <button
                onClick={() => {
                  setSelectedReqForEdit(null);
                  setIsCreatingNew(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo Requisito Mestre</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Total Geral</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{metrics.total}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60">
            <span className="text-blue-700 dark:text-blue-400 block text-[11px] font-medium">ANAC RBAC 145</span>
            <span className="text-lg font-bold text-blue-900 dark:text-blue-200">{metrics.anac}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60">
            <span className="text-sky-700 dark:text-sky-400 block text-[11px] font-medium">EASA Part-145</span>
            <span className="text-lg font-bold text-sky-900 dark:text-sky-200">{metrics.easa}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60">
            <span className="text-purple-700 dark:text-purple-400 block text-[11px] font-medium">IOSA (Setorial)</span>
            <span className="text-lg font-bold text-purple-900 dark:text-purple-200">{metrics.iosa}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
            <span className="text-amber-700 dark:text-amber-400 block text-[11px] font-medium">Contratual Clientes</span>
            <span className="text-lg font-bold text-amber-900 dark:text-amber-200">{metrics.cliente}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60">
            <span className="text-emerald-700 dark:text-emerald-400 block text-[11px] font-medium">Interno IMPACTO</span>
            <span className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{metrics.interno}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs: Acervo, Diagnóstico, Carga Segura, Matriz */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveLibraryTab('acervo')}
          className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeLibraryTab === 'acervo'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Acervo de Requisitos ({requisitos.length})</span>
        </button>

        <button
          onClick={() => setActiveLibraryTab('diagnostico')}
          className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeLibraryTab === 'diagnostico'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Diagnóstico & Inventário</span>
          {(diagnostico.duplicidadesIdentificadas.length > 0 || diagnostico.requisitosPrecisamRevisao.length > 0) && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveLibraryTab('carga')}
          className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeLibraryTab === 'carga'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <DownloadCloud className="w-4 h-4" />
          <span>Carga & Importação Segura</span>
        </button>

        <button
          onClick={() => setActiveLibraryTab('matriz')}
          className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeLibraryTab === 'matriz'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Matriz Controle ↔ Requisitos</span>
        </button>
      </div>

      {/* VIEW: Diagnóstico & Inventário */}
      {activeLibraryTab === 'diagnostico' && (
        <RequirementsDiagnosticTab
          diagnostico={diagnostico}
          onSelectRequirement={(reqId) => {
            const req = requisitos.find((r) => r.id === reqId);
            if (req) {
              setSelectedReqForEdit(req);
              setIsCreatingNew(false);
            }
          }}
          onFilterSource={(src) => {
            setSelectedFonte(src);
            setActiveLibraryTab('acervo');
          }}
          onFilterApplicability={(app) => {
            setSelectedAplicabilidade(app);
            setActiveLibraryTab('acervo');
          }}
        />
      )}

      {/* VIEW: Carga e Importação Segura de Pacotes Homologados */}
      {activeLibraryTab === 'carga' && (
        <RequirementsDataLoadTab
          requisitosExistentes={requisitos}
          onCargaConcluida={(novosItens) => {
            if (setRequisitos) {
              setRequisitos(novosItens);
            }
          }}
          userProfile={userProfile}
          organizationId={orgId}
        />
      )}

      {/* VIEW: Matriz Controle Central SGQ ↔ Requisitos */}
      {activeLibraryTab === 'matriz' && (
        <RequirementsCentralControlsMatrixTab
          controles={controles}
          requisitos={requisitos}
          onSelectRequirement={(reqId) => {
            const req = requisitos.find((r) => r.id === reqId);
            if (req) {
              setSelectedReqForEdit(req);
              setIsCreatingNew(false);
            }
          }}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* VIEW: Acervo Principal de Requisitos */}
      {activeLibraryTab === 'acervo' && (
        <>
          {/* IOSA Architectural Mandatory Notice Callout */}
          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/80 rounded-xl p-4 flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-purple-900 dark:text-purple-200">
            Diretriz Arquitetural SGQ sobre Normas Setoriais (IOSA / ISM MNT):
          </p>
          <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
            Requisitos do padrão IOSA não constituem obrigação regulatória primária direta para a IMPACTO (RBAC 145).
            São classificados formalmente como <strong>Padrão Setorial de Operadores Aéreos</strong> e tornam-se exigíveis
            exclusivamente quando incorporados ao contrato de manutenção ou escopo de serviços de cada operador atendido.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, título, texto, norma ou controle..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Filter by Source */}
          <div className="md:col-span-3">
            <select
              value={selectedFonte}
              onChange={(e) => setSelectedFonte(e.target.value)}
              className="w-full py-2 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="TODAS">Origem: Todas as Fontes</option>
              <option value="REGULATORIO_ANAC">ANAC — RBAC 145</option>
              <option value="REGULATORIO_EASA">EASA — Part-145</option>
              <option value="PADRAO_SETORIAL_IOSA">IOSA — ISM MNT/ORG</option>
              <option value="CONTRATUAL_CLIENTE">Contratual — Clientes</option>
              <option value="INTERNO_IMPACTO">Interno — IMPACTO (MOMQ)</option>
              <option value="BOA_PRATICA_REFERENCIA">Boas Práticas & Referência</option>
            </select>
          </div>

          {/* Filter by Applicability */}
          <div className="md:col-span-2">
            <select
              value={selectedAplicabilidade}
              onChange={(e) => setSelectedAplicabilidade(e.target.value)}
              className="w-full py-2 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="TODAS">Aplicabilidade: Todas</option>
              <option value="APLICAVEL">Aplicável</option>
              <option value="PARCIALMENTE_APLICAVEL">Parcialmente Aplicável</option>
              <option value="NAO_APLICAVEL">Não Aplicável</option>
              <option value="AGUARDANDO_AVALIACAO">Aguardando Avaliação</option>
            </select>
          </div>

          {/* Filter by Criticality */}
          <div className="md:col-span-2">
            <select
              value={selectedCriticidade}
              onChange={(e) => setSelectedCriticidade(e.target.value)}
              className="w-full py-2 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="TODAS">Criticidade: Todas</option>
              <option value="ALTO">Crítico / Alto</option>
              <option value="MEDIO">Médio</option>
              <option value="BAIXO">Baixo</option>
            </select>
          </div>
        </div>

        {/* Quick Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Filtros rápidos:</span>
            <button
              onClick={() => {
                setSelectedFonte('REGULATORIO_ANAC');
                setSelectedAplicabilidade('TODAS');
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                selectedFonte === 'REGULATORIO_ANAC'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              🏛️ ANAC ({metrics.anac})
            </button>
            <button
              onClick={() => {
                setSelectedFonte('REGULATORIO_EASA');
                setSelectedAplicabilidade('TODAS');
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                selectedFonte === 'REGULATORIO_EASA'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              🇪🇺 EASA ({metrics.easa})
            </button>
            <button
              onClick={() => {
                setSelectedFonte('PADRAO_SETORIAL_IOSA');
                setSelectedAplicabilidade('TODAS');
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                selectedFonte === 'PADRAO_SETORIAL_IOSA'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              ✈️ IOSA ISM ({metrics.iosa})
            </button>
            <button
              onClick={() => {
                setSelectedFonte('CONTRATUAL_CLIENTE');
                setSelectedAplicabilidade('TODAS');
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                selectedFonte === 'CONTRATUAL_CLIENTE'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              🤝 Clientes ({metrics.cliente})
            </button>
            <button
              onClick={() => {
                setSelectedFonte('INTERNO_IMPACTO');
                setSelectedAplicabilidade('TODAS');
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                selectedFonte === 'INTERNO_IMPACTO'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              🏢 IMPACTO MOMQ ({metrics.interno})
            </button>
            <button
              onClick={() => {
                setSelectedFonte('TODAS');
                setSelectedAplicabilidade('PARCIALMENTE_APLICAVEL');
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                selectedAplicabilidade === 'PARCIALMENTE_APLICAVEL'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              ⚠️ Parciais ({metrics.parciais})
            </button>
            <button
              onClick={() => {
                setSelectedFonte('TODAS');
                setSelectedAplicabilidade('NAO_APLICAVEL');
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                selectedAplicabilidade === 'NAO_APLICAVEL'
                  ? 'bg-slate-600 text-white border-slate-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              🚫 Não Aplicáveis ({metrics.naoAplicaveis})
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Exibindo <strong className="text-slate-800 dark:text-slate-200">{filteredRequirements.length}</strong> de{' '}
            {requisitos.length} requisitos
          </div>
        </div>
      </div>

      {/* Main List of Requirements */}
      <div className="space-y-4">
        {filteredRequirements.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nenhum requisito encontrado para os filtros selecionados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Tente redefinir os filtros de busca ou cadastrar um novo requisito mestre para a organização.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedFonte('TODAS');
                setSelectedAplicabilidade('TODAS');
                setSelectedCriticidade('TODAS');
              }}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          filteredRequirements.map((req) => {
            const fonteCfg = ORIGEM_CONFIG[req.fonteOrigem || 'CONTRATUAL_CLIENTE'] || ORIGEM_CONFIG.CONTRATUAL_CLIENTE;
            const aplicSit: SituacaoAplicabilidadeImpacto = req.aplicabilidadeContexto?.situacao || 'APLICAVEL';
            const aplicCfg = APLICABILIDADE_CONFIG[aplicSit] || APLICABILIDADE_CONFIG.APLICAVEL;
            const AplicIcon = aplicCfg.icon;

            const isIosa = req.fonteOrigem === 'PADRAO_SETORIAL_IOSA' || req.isIosaSetorial;

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-5 shadow-xs transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {req.numeroItem}
                      </span>

                      {/* Source Badge */}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${fonteCfg.badgeClass}`}
                        title={fonteCfg.descricao}
                      >
                        {fonteCfg.icon} {fonteCfg.label}
                      </span>

                      {/* IOSA Specific Badge */}
                      {isIosa && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-700">
                          Padrão Setorial (Operadores)
                        </span>
                      )}

                      {/* Applicability Badge */}
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${aplicCfg.badgeClass}`}
                      >
                        <AplicIcon className="w-3 h-3" />
                        {aplicCfg.label}
                      </span>

                      {/* Criticality */}
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                          req.criticidade === 'ALTO'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : req.criticidade === 'MEDIO'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {req.criticidade}
                      </span>

                      {/* Category */}
                      {req.categoria && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                          {req.categoria}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {req.tituloCurto}
                    </h3>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedReqForApplicability(req)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Gerenciar aplicabilidade formal, justificativas e escopo"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Aplicabilidade</span>
                    </button>

                    <button
                      onClick={() => setSelectedReqForHistory(req)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Ver histórico rastreável de revisões e decisões"
                    >
                      <History className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        Histórico{' '}
                        {req.historicoAlteracoesRequisito && req.historicoAlteracoesRequisito.length > 0
                          ? `(${req.historicoAlteracoesRequisito.length})`
                          : ''}
                      </span>
                    </button>

                    {!isConsulta && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedReqForEdit(req);
                            setIsCreatingNew(false);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar requisito mestre"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(req)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Excluir requisito do cadastro mestre"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Source Metadata & Edition/Revision Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block uppercase">Documento Fonte</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {req.fonteDocumentoNome || 'Não especificado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block uppercase">Edição / Revisão</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {req.edicaoRevisaoFonte || 'Vigente'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block uppercase">Data de Vigência</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {req.dataVigenciaFonte || 'Vigência contínua'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block uppercase">Ref. Original</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {req.codigoReferenciaOriginal || req.numeroItem}
                    </span>
                  </div>
                </div>

                {/* IOSA Specific Scope / Contract Notice if applies */}
                {isIosa && (
                  <div className="bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-lg p-2.5 text-xs text-purple-900 dark:text-purple-300 flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Vinculação Contratual / Escopo IOSA:</strong>{' '}
                      {req.contratoOuEscopoIncorporacaoIosa ||
                        'Exigível quando contratado especificamente pelo operador aéreo auditado (ex: Avion Express, Kalitta, Placar).'}
                    </div>
                  </div>
                )}

                {/* Original Text & Audit Question */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Texto Original do Requisito:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed font-sans select-text">
                      {req.textoOriginal}
                    </p>
                  </div>

                  {req.perguntaAuditoria && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-2.5 rounded-lg text-blue-900 dark:text-blue-200">
                      <span className="font-bold text-[11px] block text-blue-800 dark:text-blue-300">
                        Pergunta Guia de Auditoria:
                      </span>
                      <p className="italic text-xs">{req.perguntaAuditoria}</p>
                    </div>
                  )}

                  {req.interpretacaoInterna && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-2.5 rounded-lg text-emerald-900 dark:text-emerald-200">
                      <span className="font-bold text-[11px] block text-emerald-800 dark:text-emerald-300">
                        Interpretação e Posicionamento SGQ IMPACTO:
                      </span>
                      <p className="text-xs">{req.interpretacaoInterna}</p>
                    </div>
                  )}
                </div>

                {/* Controls, Procedures, Process Mapping */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block uppercase">
                      Procedimento Interno Ref.
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {req.procedimentoInternoRef || 'MOMQ Seção 3.2'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block uppercase">Processo Responsável</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {req.processoResponsavel || 'Garantia da Qualidade & Operações'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block uppercase">
                      Controle Central SGQ Vinculado
                    </span>
                    {req.controleCentralCodigo ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        {req.controleCentralCodigo} — {req.controleCentralNome || ''}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium italic">
                        Sem controle central associado
                      </span>
                    )}
                  </div>
                </div>

                {/* Expected Evidences */}
                {req.evidenciaEsperada && (
                  <div className="text-xs bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Evidência Documental / Amostragem Esperada:
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">{req.evidenciaEsperada}</span>
                  </div>
                )}

                {/* Formal Applicability Details (if not fully applicable or has context) */}
                {(aplicSit === 'PARCIALMENTE_APLICAVEL' ||
                  aplicSit === 'NAO_APLICAVEL' ||
                  req.aplicabilidadeContexto?.justificativaFormal) && (
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      aplicSit === 'NAO_APLICAVEL'
                        ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Justificativa Formal de {aplicCfg.label}:
                      </span>
                      {req.aplicabilidadeContexto?.dataAprovacao && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Aprovado em:{' '}
                          {new Date(req.aplicabilidadeContexto.dataAprovacao).toLocaleDateString('pt-BR')} por{' '}
                          {req.aplicabilidadeContexto.aprovadoPorNome || 'Gestão da Qualidade'}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed italic">
                      "{req.aplicabilidadeContexto?.justificativaFormal || 'Justificativa pendente de formalização'}"
                    </p>

                    {/* Context tags: bases, aircraft, contracts */}
                    {(req.aplicabilidadeContexto?.basesAplicaveis?.length ||
                      req.aplicabilidadeContexto?.modelosAeronaveAplicaveis?.length ||
                      req.aplicabilidadeContexto?.contratosAplicaveis?.length) ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {req.aplicabilidadeContexto?.basesAplicaveis?.map((b) => (
                          <span
                            key={b}
                            className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded"
                          >
                            Base: {b}
                          </span>
                        ))}
                        {req.aplicabilidadeContexto?.modelosAeronaveAplicaveis?.map((m) => (
                          <span
                            key={m}
                            className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded"
                          >
                            Aeronave: {m}
                          </span>
                        ))}
                        {req.aplicabilidadeContexto?.contratosAplicaveis?.map((c) => (
                          <span
                            key={c}
                            className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded"
                          >
                            Contrato: {c}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        </>
      )}

      {/* MODAL 1: Gestão de Aplicabilidade Contextual */}
      {selectedReqForApplicability && (
        <ModalEditarAplicabilidade
          requisito={selectedReqForApplicability}
          bases={bases}
          currentUser={userProfile}
          organizationId={orgId}
          onClose={() => setSelectedReqForApplicability(null)}
          onSuccess={(updatedReq) => {
            if (setRequisitos) {
              setRequisitos((prev) => [updatedReq, ...prev.filter((r) => r.id !== updatedReq.id)]);
            }
            setSelectedReqForApplicability(null);
          }}
        />
      )}

      {/* MODAL 2: Histórico Rastreável de Alterações */}
      {selectedReqForHistory && (
        <ModalHistoricoAlteracoes
          requisito={selectedReqForHistory}
          onClose={() => setSelectedReqForHistory(null)}
        />
      )}

      {/* MODAL 3: Cadastro ou Edição de Requisito Mestre */}
      {(isCreatingNew || selectedReqForEdit) && (
        <ModalRequisitoMestre
          requisito={selectedReqForEdit}
          isNew={isCreatingNew}
          clientes={clientes}
          bases={bases}
          controles={controles}
          programas={programas}
          currentUser={userProfile}
          organizationId={orgId}
          onClose={() => {
            setIsCreatingNew(false);
            setSelectedReqForEdit(null);
          }}
          onSuccess={(savedReq) => {
            if (setRequisitos) {
              setRequisitos((prev) => [savedReq, ...prev.filter((r) => r.id !== savedReq.id)]);
            }
            setIsCreatingNew(false);
            setSelectedReqForEdit(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODAL: Gestão Formal de Aplicabilidade Contextual
// ============================================================================
interface ModalEditarAplicabilidadeProps {
  requisito: RequisitoClienteItem;
  bases: BaseEstacaoOperacao[];
  currentUser?: UserProfile | null;
  organizationId: string;
  onClose: () => void;
  onSuccess: (updated: RequisitoClienteItem) => void;
}

const ModalEditarAplicabilidade: React.FC<ModalEditarAplicabilidadeProps> = ({
  requisito,
  bases,
  currentUser,
  organizationId,
  onClose,
  onSuccess
}) => {
  const currentContext = requisito.aplicabilidadeContexto || {
    situacao: 'APLICAVEL'
  };

  const [situacao, setSituacao] = useState<SituacaoAplicabilidadeImpacto>(currentContext.situacao);
  const [justificativa, setJustificativa] = useState(currentContext.justificativaFormal || '');
  const [basesInput, setBasesInput] = useState((currentContext.basesAplicaveis || []).join(', '));
  const [modelosInput, setModelosInput] = useState((currentContext.modelosAeronaveAplicaveis || []).join(', '));
  const [contratosInput, setContratosInput] = useState((currentContext.contratosAplicaveis || []).join(', '));
  const [escopoInput, setEscopoInput] = useState((currentContext.escoposOperacionaisAplicaveis || []).join(', '));

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validação mandatória da regra de governança
    if ((situacao === 'NAO_APLICAVEL' || situacao === 'PARCIALMENTE_APLICAVEL') && !justificativa.trim()) {
      setErrorMsg('A justificativa formal é estritamente obrigatória para requisitos Não Aplicáveis ou Parcialmente Aplicáveis.');
      return;
    }

    setIsSubmitting(true);

    try {
      const basesArray = basesInput
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const modelosArray = modelosInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const contratosArray = contratosInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const escoposArray = escopoInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const novaAplicabilidade: AplicabilidadeContextualImpacto = {
        situacao,
        justificativaFormal: justificativa.trim() || undefined,
        basesAplicaveis: basesArray.length > 0 ? basesArray : undefined,
        modelosAeronaveAplicaveis: modelosArray.length > 0 ? modelosArray : undefined,
        contratosAplicaveis: contratosArray.length > 0 ? contratosArray : undefined,
        escoposOperacionaisAplicaveis: escoposArray.length > 0 ? escoposArray : undefined
      };

      await updateAplicabilidadeRequisitoMestre(
        organizationId,
        requisito.id,
        novaAplicabilidade,
        requisito,
        currentUser
      );

      const now = new Date().toISOString();
      const novoHistoricoItem: HistoricoAlteracaoRequisitoItem = {
        id: `HIST-${Date.now()}`,
        dataHora: now,
        usuarioNome: currentUser?.displayName || 'Gestor SGQ',
        usuarioUid: currentUser?.uid || 'system',
        campoAlterado: 'aplicabilidadeContexto.situacao',
        valorAnterior: requisito.aplicabilidadeContexto?.situacao || 'APLICAVEL',
        valorNovo: situacao,
        justificativa: justificativa.trim() || 'Atualização de aplicabilidade',
        revisaoFonteRelacionada: requisito.edicaoRevisaoFonte || requisito.fonteDocumentoNome
      };

      const updatedRequisito: RequisitoClienteItem = {
        ...requisito,
        aplicabilidadeContexto: {
          ...novaAplicabilidade,
          aprovadoPorNome: currentUser?.displayName || 'Gestor SGQ',
          aprovadoPorUid: currentUser?.uid || 'system',
          dataAprovacao: now
        },
        historicoAlteracoesRequisito: [
          novoHistoricoItem,
          ...(requisito.historicoAlteracoesRequisito || [])
        ],
        updatedAt: now
      };

      onSuccess(updatedRequisito);
    } catch (err: any) {
      console.error('Erro ao atualizar aplicabilidade:', err);
      setErrorMsg(err.message || 'Falha ao salvar aplicabilidade.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Gestão de Aplicabilidade à IMPACTO
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Requisito {requisito.numeroItem} • {requisito.tituloCurto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Situação Selection */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-800 dark:text-slate-200">
              Situação de Aplicabilidade *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['APLICAVEL', 'PARCIALMENTE_APLICAVEL', 'NAO_APLICAVEL', 'AGUARDANDO_AVALIACAO'] as SituacaoAplicabilidadeImpacto[]).map((sit) => {
                const isSelected = situacao === sit;
                const cfg = APLICABILIDADE_CONFIG[sit];
                return (
                  <button
                    key={sit}
                    type="button"
                    onClick={() => setSituacao(sit)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? `${cfg.badgeClass} ring-2 ring-emerald-500/50 font-bold`
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm">{cfg.icon({ className: 'w-4 h-4' })}</span>
                    <span className="text-xs">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Justificativa formal */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-800 dark:text-slate-200">
              Justificativa Formal da Decisão {(situacao === 'NAO_APLICAVEL' || situacao === 'PARCIALMENTE_APLICAVEL') && <span className="text-rose-500 font-bold">* (Obrigatória)</span>}
            </label>
            <textarea
              rows={4}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explicitar o fundamento regulatório, operacional ou contratual que embase a aplicabilidade parcial ou não aplicabilidade..."
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Contextos Opcionais */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
              Recortes Contextuais Opcionais (apenas quando pertinente)
            </h4>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                Bases Aplicáveis (separar por vírgula, ex: SOD, GRU, REC)
              </label>
              <input
                type="text"
                value={basesInput}
                onChange={(e) => setBasesInput(e.target.value)}
                placeholder="Ex: SOD, GRU (deixe em branco se aplicável a todas)"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                Modelos de Aeronave / Frotas Aplicáveis
              </label>
              <input
                type="text"
                value={modelosInput}
                onChange={(e) => setModelosInput(e.target.value)}
                placeholder="Ex: A320, A321, B737-800 (ou em branco se aplicável a todas)"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                Contratos / Escopos Específicos
              </label>
              <input
                type="text"
                value={contratosInput}
                onChange={(e) => setContratosInput(e.target.value)}
                placeholder="Ex: Contrato de Linha Kalitta 2024, Escopo Placar C-Check"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Homologando...' : 'Salvar Decisão de Aplicabilidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: Histórico Rastreável de Alterações
// ============================================================================
interface ModalHistoricoAlteracoesProps {
  requisito: RequisitoClienteItem;
  onClose: () => void;
}

const ModalHistoricoAlteracoes: React.FC<ModalHistoricoAlteracoesProps> = ({ requisito, onClose }) => {
  const historico = requisito.historicoAlteracoesRequisito || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Histórico Rastreável de Alterações & Decisões
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Requisito {requisito.numeroItem} • {requisito.tituloCurto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {historico.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma alteração registrada após a criação inicial deste requisito.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Data de cadastro mestre: {new Date(requisito.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6">
              {historico.map((h, idx) => (
                <div key={h.id || idx} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />

                  <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {h.usuarioNome || 'Usuário SGQ'}
                      </span>
                      <span className="text-slate-400">
                        {new Date(h.dataHora).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="text-slate-700 dark:text-slate-300">
                      Campo alterado:{' '}
                      <code className="text-xs font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">
                        {h.campoAlterado}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                      <span className="line-through text-rose-500 dark:text-rose-400">
                        {h.valorAnterior || '—'}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {h.valorNovo}
                      </span>
                    </div>

                    {h.justificativa && (
                      <div className="mt-1 p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 italic text-slate-700 dark:text-slate-300">
                        "{h.justificativa}"
                      </div>
                    )}

                    {h.revisaoFonteRelacionada && (
                      <div className="text-[10px] text-slate-400">
                        Vinculado à revisão documental: {h.revisaoFonteRelacionada}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: Criar ou Editar Requisito Mestre Completo
// ============================================================================
interface ModalRequisitoMestreProps {
  requisito: RequisitoClienteItem | null;
  isNew: boolean;
  clientes: ClienteExterno[];
  bases: BaseEstacaoOperacao[];
  controles: ControleCentralSGQ[];
  programas: ProgramaChecklistCliente[];
  currentUser?: UserProfile | null;
  organizationId: string;
  onClose: () => void;
  onSuccess: (saved: RequisitoClienteItem) => void;
}

const ModalRequisitoMestre: React.FC<ModalRequisitoMestreProps> = ({
  requisito,
  isNew,
  clientes,
  bases,
  controles,
  programas,
  currentUser,
  organizationId,
  onClose,
  onSuccess
}) => {
  // Form state
  const [fonteOrigem, setFonteOrigem] = useState<TipoOrigemRequisito>(
    requisito?.fonteOrigem || 'REGULATORIO_ANAC'
  );
  const [fonteDocumentoNome, setFonteDocumentoNome] = useState(
    requisito?.fonteDocumentoNome || (fonteOrigem === 'REGULATORIO_ANAC' ? 'RBAC 145 Emenda 06' : '')
  );
  const [edicaoRevisaoFonte, setEdicaoRevisaoFonte] = useState(
    requisito?.edicaoRevisaoFonte || 'Emenda 06'
  );
  const [dataVigenciaFonte, setDataVigenciaFonte] = useState(
    requisito?.dataVigenciaFonte || new Date().toISOString().split('T')[0]
  );
  const [numeroItem, setNumeroItem] = useState(requisito?.numeroItem || 'REQ-NOVO-01');
  const [codigoReferenciaOriginal, setCodigoReferenciaOriginal] = useState(
    requisito?.codigoReferenciaOriginal || ''
  );
  const [tituloCurto, setTituloCurto] = useState(requisito?.tituloCurto || '');
  const [textoOriginal, setTextoOriginal] = useState(requisito?.textoOriginal || '');
  const [perguntaAuditoria, setPerguntaAuditoria] = useState(requisito?.perguntaAuditoria || '');
  const [interpretacaoInterna, setInterpretacaoInterna] = useState(requisito?.interpretacaoInterna || '');
  const [procedimentoInternoRef, setProcedimentoInternoRef] = useState(
    requisito?.procedimentoInternoRef || 'MOMQ Seção 3.2'
  );
  const [processoResponsavel, setProcessoResponsavel] = useState(
    requisito?.processoResponsavel || 'Garantia da Qualidade'
  );
  const [controleCentralId, setControleCentralId] = useState(requisito?.controleCentralId || '');
  const [evidenciaEsperada, setEvidenciaEsperada] = useState(requisito?.evidenciaEsperada || '');
  const [criticidade, setCriticidade] = useState<'BAIXO' | 'MEDIO' | 'ALTO'>(
    requisito?.criticidade || 'MEDIO'
  );
  const [categoria, setCategoria] = useState(requisito?.categoria || 'Geral');

  // IOSA specific
  const [isIosaSetorial, setIsIosaSetorial] = useState(
    requisito?.isIosaSetorial ?? (fonteOrigem === 'PADRAO_SETORIAL_IOSA')
  );
  const [contratoOuEscopoIncorporacaoIosa, setContratoOuEscopoIncorporacaoIosa] = useState(
    requisito?.contratoOuEscopoIncorporacaoIosa || ''
  );

  // Cliente selection (when CONTRATUAL_CLIENTE)
  const [clienteId, setClienteId] = useState(requisito?.clienteId || (clientes[0]?.id || ''));

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto adjust when source changes
  const handleFonteChange = (f: TipoOrigemRequisito) => {
    setFonteOrigem(f);
    if (f === 'PADRAO_SETORIAL_IOSA') {
      setIsIosaSetorial(true);
      if (!fonteDocumentoNome) setFonteDocumentoNome('IOSA Standards Manual (ISM) Ed. 16');
    } else {
      setIsIosaSetorial(false);
      if (f === 'REGULATORIO_ANAC' && !fonteDocumentoNome) {
        setFonteDocumentoNome('RBAC 145 Emenda 06');
      } else if (f === 'REGULATORIO_EASA' && !fonteDocumentoNome) {
        setFonteDocumentoNome('EASA Part-145 Annex II (Regulation EU 1321/2014)');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!numeroItem.trim()) {
      setErrorMsg('O código/número do item é obrigatório (ex: REQ-ANAC-145-109).');
      return;
    }
    if (!tituloCurto.trim()) {
      setErrorMsg('O título curto do requisito é obrigatório.');
      return;
    }
    if (!textoOriginal.trim()) {
      setErrorMsg('O texto original normativo do requisito é obrigatório.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCtrl = controles.find((c) => c.id === controleCentralId);
      const selectedClient = clientes.find((c) => c.id === clienteId);

      const payload: Partial<RequisitoClienteItem> = {
        id: requisito?.id,
        organizationId,
        numeroItem: numeroItem.trim(),
        codigoReferenciaOriginal: codigoReferenciaOriginal.trim() || numeroItem.trim(),
        tituloCurto: tituloCurto.trim(),
        textoOriginal: textoOriginal.trim(),
        categoria: categoria.trim(),
        fonteOrigem,
        fonteDocumentoNome: fonteDocumentoNome.trim(),
        edicaoRevisaoFonte: edicaoRevisaoFonte.trim(),
        dataVigenciaFonte: dataVigenciaFonte.trim(),
        perguntaAuditoria: perguntaAuditoria.trim() || undefined,
        interpretacaoInterna: interpretacaoInterna.trim() || undefined,
        procedimentoInternoRef: procedimentoInternoRef.trim() || undefined,
        processoResponsavel: processoResponsavel.trim() || undefined,
        controleCentralId: selectedCtrl?.id,
        controleCentralCodigo: selectedCtrl?.codigo,
        controleCentralNome: selectedCtrl?.nome,
        evidenciaEsperada: evidenciaEsperada.trim() || undefined,
        criticidade,
        isIosaSetorial,
        contratoOuEscopoIncorporacaoIosa:
          isIosaSetorial ? contratoOuEscopoIncorporacaoIosa.trim() || undefined : undefined,
        clienteId: fonteOrigem === 'CONTRATUAL_CLIENTE' ? selectedClient?.id : undefined,
        clienteNome: fonteOrigem === 'CONTRATUAL_CLIENTE' ? selectedClient?.nome : undefined,
        aplicabilidadeContexto: requisito?.aplicabilidadeContexto || {
          situacao: 'APLICAVEL'
        }
      };

      const savedId = await saveRequisitoCliente(organizationId, payload, currentUser);

      const savedReq: RequisitoClienteItem = {
        ...(requisito || ({} as RequisitoClienteItem)),
        ...payload,
        id: savedId,
        organizationId,
        createdAt: requisito?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as RequisitoClienteItem;

      onSuccess(savedReq);
    } catch (err: any) {
      console.error('Erro ao salvar requisito mestre:', err);
      setErrorMsg(err.message || 'Falha ao salvar requisito.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {isNew ? 'Cadastrar Novo Requisito Mestre' : `Editar Requisito ${requisito?.numeroItem}`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cadastro multi-fontes com suporte a regulamentos, padrões setoriais e clientes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Fonte de Origem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Classificação da Fonte *
              </label>
              <select
                value={fonteOrigem}
                onChange={(e) => handleFonteChange(e.target.value as TipoOrigemRequisito)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="REGULATORIO_ANAC">🏛️ Regulatório ANAC (RBAC 145)</option>
                <option value="REGULATORIO_EASA">🇪🇺 Regulatório EASA (Part-145)</option>
                <option value="PADRAO_SETORIAL_IOSA">✈️ Padrão Setorial IOSA (ISM MNT/ORG)</option>
                <option value="CONTRATUAL_CLIENTE">🤝 Requisito Contratual de Cliente</option>
                <option value="INTERNO_IMPACTO">🏢 Interno IMPACTO (MOMQ / MPO)</option>
                <option value="BOA_PRATICA_REFERENCIA">💡 Boa Prática SGQ</option>
              </select>
            </div>

            {fonteOrigem === 'CONTRATUAL_CLIENTE' && (
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Cliente Operador Associado
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* IOSA Special Rule Callout if IOSA */}
          {fonteOrigem === 'PADRAO_SETORIAL_IOSA' && (
            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-semibold">
                <Info className="w-4 h-4 text-purple-500" />
                <span>Norma Setorial IATA / IOSA</span>
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                Este requisito é classificado como padrão setorial para operadores aéreos. Por diretriz do SGQ,
                ele só se torna mandatório quando incorporado por contrato ou escopo operacional com a IMPACTO.
              </p>
              <div>
                <label className="block font-medium text-purple-900 dark:text-purple-200 text-[11px] mb-1">
                  Contrato ou Escopo de Incorporação:
                </label>
                <input
                  type="text"
                  value={contratoOuEscopoIncorporacaoIosa}
                  onChange={(e) => setContratoOuEscopoIncorporacaoIosa(e.target.value)}
                  placeholder="Ex: Contrato Avion Express 2024 - Cláusula 5.1 / Escopo de Linha"
                  className="w-full p-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Document metadata: Name, Edition/Revision, Effective date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome do Documento / Norma *
              </label>
              <input
                type="text"
                value={fonteDocumentoNome}
                onChange={(e) => setFonteDocumentoNome(e.target.value)}
                placeholder="Ex: RBAC 145, IOSA ISM, MOMQ"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Edição / Revisão
              </label>
              <input
                type="text"
                value={edicaoRevisaoFonte}
                onChange={(e) => setEdicaoRevisaoFonte(e.target.value)}
                placeholder="Ex: Emenda 06, Ed. 16, Rev. 02"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data de Vigência
              </label>
              <input
                type="date"
                value={dataVigenciaFonte}
                onChange={(e) => setDataVigenciaFonte(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Code, Original Ref, Category, Criticality */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Código QualyQuest *
              </label>
              <input
                type="text"
                value={numeroItem}
                onChange={(e) => setNumeroItem(e.target.value)}
                placeholder="Ex: REQ-ANAC-145-109"
                className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ref. Original do Requisito
              </label>
              <input
                type="text"
                value={codigoReferenciaOriginal}
                onChange={(e) => setCodigoReferenciaOriginal(e.target.value)}
                placeholder="Ex: 145.109, MNT 1.11.1"
                className="w-full p-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Categoria / Área
              </label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Ferramental, Pessoal, SGQ"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Criticidade
              </label>
              <select
                value={criticidade}
                onChange={(e) => setCriticidade(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="ALTO">Alto / Crítico</option>
                <option value="MEDIO">Médio</option>
                <option value="BAIXO">Baixo</option>
              </select>
            </div>
          </div>

          {/* Título Curto */}
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Título Curto do Requisito *
            </label>
            <input
              type="text"
              value={tituloCurto}
              onChange={(e) => setTituloCurto(e.target.value)}
              placeholder="Ex: Equipamentos, Ferramentas e Materiais de Manutenção"
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold"
            />
          </div>

          {/* Texto Original */}
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Texto Original Completo da Norma / Requisito *
            </label>
            <textarea
              rows={4}
              value={textoOriginal}
              onChange={(e) => setTextoOriginal(e.target.value)}
              placeholder="Inserir a redação integral conforme publicada na fonte oficial..."
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans leading-relaxed"
            />
          </div>

          {/* Pergunta de Auditoria */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pergunta Guia de Auditoria (opcional)
            </label>
            <input
              type="text"
              value={perguntaAuditoria}
              onChange={(e) => setPerguntaAuditoria(e.target.value)}
              placeholder="Ex: A organização possui as ferramentas especificadas pelo fabricante calibradas e disponíveis?"
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Interpretação Interna */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Interpretação e Posicionamento SGQ IMPACTO (opcional)
            </label>
            <textarea
              rows={2}
              value={interpretacaoInterna}
              onChange={(e) => setInterpretacaoInterna(e.target.value)}
              placeholder="Entendimento técnico acordado pelo SGQ da IMPACTO para atendimento uniforme..."
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Procedimento Interno & Processo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Procedimento Interno Ref. (MOMQ / MPO)
              </label>
              <input
                type="text"
                value={procedimentoInternoRef}
                onChange={(e) => setProcedimentoInternoRef(e.target.value)}
                placeholder="Ex: MOMQ Seção 3.2, MPO Cap. 4"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Processo Responsável
              </label>
              <input
                type="text"
                value={processoResponsavel}
                onChange={(e) => setProcessoResponsavel(e.target.value)}
                placeholder="Ex: Manutenção de Linha, Engenharia, SGQ"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Controle Central & Evidência Esperada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Controle Central SGQ ("Um Controle, Vários Requisitos")
              </label>
              <select
                value={controleCentralId}
                onChange={(e) => setControleCentralId(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="">— Sem controle central associado —</option>
                {controles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Evidência Documental Típica Esperada
              </label>
              <input
                type="text"
                value={evidenciaEsperada}
                onChange={(e) => setEvidenciaEsperada(e.target.value)}
                placeholder="Ex: Certificados de calibração vigentes, Ordens de Serviço"
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : isNew ? 'Cadastrar Requisito Mestre' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
