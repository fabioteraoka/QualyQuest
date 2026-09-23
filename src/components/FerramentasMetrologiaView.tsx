import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  History,
  Edit2,
  Trash2,
  Power,
  ShieldCheck,
  Building2,
  FileText,
  Sliders,
  Filter,
  X,
  Calendar,
  Save,
  Layers,
  ChevronRight,
  RotateCcw,
  Info,
} from 'lucide-react';
import { FerramentaCalibracao, OrganizationRecord, UserProfile } from '../types';
import {
  saveCalibratedTool,
  toggleAtivoFerramenta,
  deleteFerramentaCalibrada,
  registrarAfericaoCalibracao,
} from '../services/firebase/smartImportFirestore';
import {
  analisarLoteFerramentas,
  executarLoteFerramentas,
  TipoAcaoLoteFerramenta,
  ResultadoAnaliseLote,
} from '../services/bulkManagementService';
import { BulkActionModal } from './common/BulkActionModal';

interface FerramentasMetrologiaViewProps {
  organization: OrganizationRecord | null;
  user: UserProfile | null;
  ferramentasCalibradas: FerramentaCalibracao[];
  onNavigateToTab?: (tab: string) => void;
  onAdicionarFerramenta?: (ferramenta: FerramentaCalibracao) => void;
  onRemoverFerramenta?: (toolId: string) => void;
}

export const FerramentasMetrologiaView: React.FC<FerramentasMetrologiaViewProps> = ({
  organization,
  user,
  ferramentasCalibradas,
  onNavigateToTab,
  onAdicionarFerramenta,
  onRemoverFerramenta,
}) => {
  const orgId = organization?.id || 'demo-org';

  // Estados de filtros
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODAS' | 'CALIBRADA' | 'PROXIMA_VENCIMENTO' | 'VENCIDA' | 'QUARENTENA' | 'INATIVAS'>('TODAS');
  const [filtroSetor, setFiltroSetor] = useState<string>('TODOS');

  // Estados de modais
  const [modalEdicaoAberta, setModalEdicaoAberta] = useState(false);
  const [ferramentaEmEdicao, setFerramentaEmEdicao] = useState<Partial<FerramentaCalibracao> | null>(null);

  const [modalNovaCalibracaoAberta, setModalNovaCalibracaoAberta] = useState(false);
  const [ferramentaParaCalibrar, setFerramentaParaCalibrar] = useState<FerramentaCalibracao | null>(null);
  const [dadosNovaCalib, setDadosNovaCalib] = useState({
    data: new Date().toISOString().split('T')[0],
    certificado: '',
    laboratorio: '',
    validadeAte: '',
    observacao: '',
  });

  const [modalHistoricoAberta, setModalHistoricoAberta] = useState(false);
  const [ferramentaHistorico, setFerramentaHistorico] = useState<FerramentaCalibracao | null>(null);

  // Modal de Detalhes de Origem / Rastreabilidade
  const [ferramentaOrigem, setFerramentaOrigem] = useState<FerramentaCalibracao | null>(null);

  // Estados de Gestão em Lote (Fase Corretiva Integrada)
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [acaoLote, setAcaoLote] = useState<TipoAcaoLoteFerramenta>('INATIVAR');
  const [analiseLote, setAnaliseLote] = useState<ResultadoAnaliseLote<FerramentaCalibracao> | null>(null);
  const [sucessoLoteMsg, setSucessoLoteMsg] = useState<string | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Setores únicos para filtro
  const setoresUnicos = useMemo(() => {
    const sets = new Set<string>();
    ferramentasCalibradas.forEach((f) => {
      if (f.setor) sets.add(f.setor);
    });
    return Array.from(sets).sort();
  }, [ferramentasCalibradas]);

  // Contadores de status
  const contadores = useMemo(() => {
    let calibradas = 0;
    let proximaVencimento = 0;
    let vencidas = 0;
    let quarentena = 0;
    let inativas = 0;

    ferramentasCalibradas.forEach((f) => {
      if (f.ativo === false) {
        inativas++;
        return;
      }
      if (f.status === 'QUARENTENA') quarentena++;
      else if (f.status === 'VENCIDA') vencidas++;
      else if (f.status === 'PROXIMA_VENCIMENTO') proximaVencimento++;
      else calibradas++;
    });

    return {
      total: ferramentasCalibradas.length,
      calibradas,
      proximaVencimento,
      vencidas,
      quarentena,
      inativas,
    };
  }, [ferramentasCalibradas]);

  // Ferramentas filtradas
  const ferramentasFiltradas = useMemo(() => {
    return ferramentasCalibradas.filter((f) => {
      const isAtivo = f.ativo !== false;

      // Filtro de status
      if (filtroStatus === 'INATIVAS') {
        if (isAtivo) return false;
      } else if (filtroStatus === 'CALIBRADA') {
        if (!isAtivo || f.status !== 'CALIBRADA') return false;
      } else if (filtroStatus === 'PROXIMA_VENCIMENTO') {
        if (!isAtivo || f.status !== 'PROXIMA_VENCIMENTO') return false;
      } else if (filtroStatus === 'VENCIDA') {
        if (!isAtivo || f.status !== 'VENCIDA') return false;
      } else if (filtroStatus === 'QUARENTENA') {
        if (!isAtivo || f.status !== 'QUARENTENA') return false;
      }

      // Filtro de setor
      if (filtroSetor !== 'TODOS' && f.setor !== filtroSetor) return false;

      // Busca textual
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchPatrimonio = f.codigoPatrimonio?.toLowerCase().includes(termo);
        const matchDesc = f.descricao?.toLowerCase().includes(termo);
        const matchSerie = f.numeroSerie?.toLowerCase().includes(termo);
        const matchFab = f.fabricante?.toLowerCase().includes(termo);
        const matchCert = f.numeroCertificado?.toLowerCase().includes(termo);
        if (!matchPatrimonio && !matchDesc && !matchSerie && !matchFab && !matchCert) return false;
      }

      return true;
    });
  }, [ferramentasCalibradas, filtroStatus, filtroSetor, busca]);

  // Handlers para Gestão em Lote
  const handleAbrirAcaoLote = (acao: TipoAcaoLoteFerramenta) => {
    const ferramentasSelecionadas = ferramentasCalibradas.filter((f) => selectedToolIds.has(f.id));
    if (ferramentasSelecionadas.length === 0) return;

    const res = analisarLoteFerramentas(ferramentasSelecionadas, acao);

    setAnaliseLote(res);
    setAcaoLote(acao);
    setModalLoteAberto(true);
  };

  const handleConfirmarAcaoLote = async (dados: {
    somentePermitidos: boolean;
    motivo: string;
  }) => {
    if (!analiseLote) return;
    const alvos = analiseLote.permitidos.map((x) => x.item);
    const resultado = await executarLoteFerramentas(
      orgId,
      alvos,
      acaoLote,
      { motivo: dados.motivo },
      user
    );

    setSelectedToolIds(new Set());
    setModalLoteAberto(false);
    setSucessoLoteMsg(resultado.mensagem);
    setTimeout(() => setSucessoLoteMsg(null), 5000);
  };

  // Handler para Salvar Instrumento (Novo ou Editado)
  const handleSalvarInstrumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ferramentaEmEdicao?.codigoPatrimonio || !ferramentaEmEdicao?.descricao) {
      alert('Preencha os campos obrigatórios (Patrimônio e Descrição).');
      return;
    }

    setSalvando(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const prox = ferramentaEmEdicao.dataProximaCalibracao || hoje;
      let statusCalib: FerramentaCalibracao['status'] = 'CALIBRADA';
      if (prox < hoje) {
        statusCalib = 'VENCIDA';
      } else {
        const diffMs = new Date(prox).getTime() - new Date(hoje).getTime();
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDias <= 30) statusCalib = 'PROXIMA_VENCIMENTO';
      }

      const ferramentaFinal: FerramentaCalibracao = {
        id: ferramentaEmEdicao.id || `tool-${Date.now()}`,
        organizationId: orgId,
        codigoPatrimonio: ferramentaEmEdicao.codigoPatrimonio.trim().toUpperCase(),
        descricao: ferramentaEmEdicao.descricao.trim(),
        fabricante: ferramentaEmEdicao.fabricante || 'Genérico',
        modelo: ferramentaEmEdicao.modelo || '',
        numeroSerie: ferramentaEmEdicao.numeroSerie || 'S/N',
        setor: ferramentaEmEdicao.setor || 'Hangar de Manutenção',
        status: ferramentaEmEdicao.status || statusCalib,
        ativo: ferramentaEmEdicao.ativo !== false,
        dataUltimaCalibracao: ferramentaEmEdicao.dataUltimaCalibracao || hoje,
        dataProximaCalibracao: prox,
        frequenciaMeses: ferramentaEmEdicao.frequenciaMeses || 12,
        laboratorioCalibrador: ferramentaEmEdicao.laboratorioCalibrador || 'Laboratório Homologado RBC',
        numeroCertificado: ferramentaEmEdicao.numeroCertificado || '',
        tolerancia: ferramentaEmEdicao.tolerancia || '',
        observacoes: ferramentaEmEdicao.observacoes || '',
        historicoCalibracoes: ferramentaEmEdicao.historicoCalibracoes || [],
        criadoEm: ferramentaEmEdicao.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };

      await saveCalibratedTool(orgId, ferramentaFinal, user);
      if (onAdicionarFerramenta) onAdicionarFerramenta(ferramentaFinal);

      setMensagemSucesso(`Instrumento ${ferramentaFinal.codigoPatrimonio} salvo com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
      setModalEdicaoAberta(false);
      setFerramentaEmEdicao(null);
    } catch (err) {
      console.error('Erro ao salvar ferramenta:', err);
      alert('Erro ao salvar instrumento. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Handler para Registrar Nova Calibração
  const handleSalvarNovaCalibracao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ferramentaParaCalibrar || !dadosNovaCalib.data || !dadosNovaCalib.validadeAte || !dadosNovaCalib.certificado) {
      alert('Preencha os campos obrigatórios da calibração (Data, Validade e Certificado).');
      return;
    }

    setSalvando(true);
    try {
      await registrarAfericaoCalibracao(
        orgId,
        ferramentaParaCalibrar.id,
        {
          data: dadosNovaCalib.data,
          certificado: dadosNovaCalib.certificado,
          laboratorio: dadosNovaCalib.laboratorio || 'Laboratório RBC',
          validadeAte: dadosNovaCalib.validadeAte,
          observacao: dadosNovaCalib.observacao,
        },
        user
      );

      // Atualiza estado local
      const atualizada: FerramentaCalibracao = {
        ...ferramentaParaCalibrar,
        dataUltimaCalibracao: dadosNovaCalib.data,
        dataProximaCalibracao: dadosNovaCalib.validadeAte,
        numeroCertificado: dadosNovaCalib.certificado,
        laboratorioCalibrador: dadosNovaCalib.laboratorio || ferramentaParaCalibrar.laboratorioCalibrador,
        status: dadosNovaCalib.validadeAte < new Date().toISOString().split('T')[0] ? 'VENCIDA' : 'CALIBRADA',
        historicoCalibracoes: [
          {
            id: `calib-${Date.now()}`,
            data: dadosNovaCalib.data,
            certificado: dadosNovaCalib.certificado,
            laboratorio: dadosNovaCalib.laboratorio || 'Laboratório RBC',
            validadeAte: dadosNovaCalib.validadeAte,
            observacao: dadosNovaCalib.observacao,
            registradoPor: user?.displayName || user?.email || 'Inspetor',
          },
          ...(ferramentaParaCalibrar.historicoCalibracoes || []),
        ],
        atualizadoEm: new Date().toISOString(),
      };
      if (onAdicionarFerramenta) onAdicionarFerramenta(atualizada);

      setMensagemSucesso(`Nova calibração registrada para ${ferramentaParaCalibrar.codigoPatrimonio}!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
      setModalNovaCalibracaoAberta(false);
      setFerramentaParaCalibrar(null);
    } catch (err) {
      console.error('Erro ao registrar calibração:', err);
      alert('Erro ao registrar calibração.');
    } finally {
      setSalvando(false);
    }
  };

  // Alternar Ativo/Inativo
  const handleToggleAtivo = async (tool: FerramentaCalibracao) => {
    const novoAtivo = tool.ativo === false;
    const confirmacao = window.confirm(
      `Deseja ${novoAtivo ? 'reativar' : 'inativar'} o instrumento ${tool.codigoPatrimonio}?`
    );
    if (!confirmacao) return;

    try {
      await toggleAtivoFerramenta(orgId, tool.id, novoAtivo, user);
      if (onAdicionarFerramenta) {
        onAdicionarFerramenta({ ...tool, ativo: novoAtivo });
      }
    } catch (err) {
      console.error('Erro ao alternar status do instrumento:', err);
    }
  };

  // Exportar Relatório RBC em CSV
  const handleExportarCSV = () => {
    if (ferramentasCalibradas.length === 0) {
      alert('Nenhum instrumento cadastrado para exportação.');
      return;
    }

    const headers = [
      'Patrimonio',
      'Descricao',
      'Fabricante',
      'Modelo',
      'NumeroSerie',
      'Setor',
      'Status',
      'Ativo',
      'UltimaCalibracao',
      'ProximaCalibracao',
      'FrequenciaMeses',
      'CertificadoRBC',
      'Laboratorio',
      'Tolerancia',
    ];

    const rows = ferramentasCalibradas.map((t) => [
      `"${t.codigoPatrimonio || ''}"`,
      `"${(t.descricao || '').replace(/"/g, '""')}"`,
      `"${t.fabricante || ''}"`,
      `"${t.modelo || ''}"`,
      `"${t.numeroSerie || ''}"`,
      `"${t.setor || ''}"`,
      `"${t.status || ''}"`,
      `"${t.ativo !== false ? 'SIM' : 'NAO'}"`,
      `"${t.dataUltimaCalibracao || ''}"`,
      `"${t.dataProximaCalibracao || ''}"`,
      `"${t.frequenciaMeses || 12}"`,
      `"${t.numeroCertificado || ''}"`,
      `"${(t.laboratorioCalibrador || '').replace(/"/g, '""')}"`,
      `"${(t.tolerancia || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventario_Ferramental_RBC_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="modulo-ferramentas-metrologia" className="space-y-6">
      {/* Banner de Mensagem de Sucesso */}
      {mensagemSucesso && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{mensagemSucesso}</span>
          </div>
          <button onClick={() => setMensagemSucesso(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho Oficial do Módulo Operacional */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                RBAC 145.109 / EASA PART 145
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                RASTREABILIDADE RBC / INMETRO / NIST
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                MÓDULO OFICIAL OPERACIONAL
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-6 h-6 text-blue-600" />
              Ferramental & Metrologia Operacional
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Módulo operacional oficial para cadastro, calibração periódica, tolerâncias e governança metrológica de torquímetros, manômetros, multímetros e instrumentos calibrados exigidos na liberação técnica de aeronaves.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setFerramentaEmEdicao({
                  ativo: true,
                  frequenciaMeses: 12,
                  dataUltimaCalibracao: new Date().toISOString().split('T')[0],
                  dataProximaCalibracao: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
                });
                setModalEdicaoAberta(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Novo Instrumento
            </button>

            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('importacao-inteligente')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Importar Planilha RBC
              </button>
            )}

            <button
              onClick={handleExportarCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
            >
              <Download className="w-4 h-4 text-blue-600" />
              Exportar Inventário
            </button>
          </div>
        </div>

        {/* Cards de Status Metrológico Interativos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div
            onClick={() => setFiltroStatus(filtroStatus === 'CALIBRADA' ? 'TODAS' : 'CALIBRADA')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              filtroStatus === 'CALIBRADA'
                ? 'bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-500'
                : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-bold">Calibradas (Aptas)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-1">{contadores.calibradas}</p>
            <span className="text-[11px] text-emerald-700">Liberadas para uso em voo</span>
          </div>

          <div
            onClick={() => setFiltroStatus(filtroStatus === 'PROXIMA_VENCIMENTO' ? 'TODAS' : 'PROXIMA_VENCIMENTO')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              filtroStatus === 'PROXIMA_VENCIMENTO'
                ? 'bg-amber-100/80 border-amber-400 ring-2 ring-amber-500'
                : 'bg-amber-50 border-amber-200 hover:bg-amber-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-800 font-bold">A Vencer (≤30 dias)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-950 mt-1">{contadores.proximaVencimento}</p>
            <span className="text-[11px] text-amber-700">Requer agendamento</span>
          </div>

          <div
            onClick={() => setFiltroStatus(filtroStatus === 'VENCIDA' ? 'TODAS' : 'VENCIDA')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              filtroStatus === 'VENCIDA'
                ? 'bg-red-100/80 border-red-400 ring-2 ring-red-500'
                : 'bg-red-50 border-red-200 hover:bg-red-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-800 font-bold">Vencidas</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-black text-red-950 mt-1">{contadores.vencidas}</p>
            <span className="text-[11px] text-red-700">Bloqueio de uso imediato</span>
          </div>

          <div
            onClick={() => setFiltroStatus(filtroStatus === 'QUARENTENA' ? 'TODAS' : 'QUARENTENA')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              filtroStatus === 'QUARENTENA'
                ? 'bg-purple-100/80 border-purple-400 ring-2 ring-purple-500'
                : 'bg-purple-50 border-purple-200 hover:bg-purple-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-800 font-bold">Quarentena</span>
              <Ban className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-950 mt-1">{contadores.quarentena}</p>
            <span className="text-[11px] text-purple-700">Aguardando laudo técnico</span>
          </div>

          <div
            onClick={() => setFiltroStatus('TODAS')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              filtroStatus === 'TODAS'
                ? 'bg-slate-100/90 border-slate-400 ring-2 ring-blue-500'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 font-bold">Total no Tenant</span>
              <Layers className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{contadores.total}</p>
            <span className="text-[11px] text-slate-500">Coleção calibrated_tools</span>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por tag/patrimônio, descrição, série, fabricante..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Filtro de Setor */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Setor:</span>
              <select
                value={filtroSetor}
                onChange={(e) => setFiltroSetor(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800 font-semibold"
              >
                <option value="TODOS">Todos os Setores</option>
                {setoresUnicos.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Status Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800 font-semibold"
              >
                <option value="TODAS">Todos os Status</option>
                <option value="CALIBRADA">Calibradas</option>
                <option value="PROXIMA_VENCIMENTO">Próximas ao Vencimento</option>
                <option value="VENCIDA">Vencidas</option>
                <option value="QUARENTENA">Quarentena</option>
                <option value="INATIVAS">Inativas</option>
              </select>
            </div>

            {(busca || filtroStatus !== 'TODAS' || filtroSetor !== 'TODOS') && (
              <button
                onClick={() => {
                  setBusca('');
                  setFiltroStatus('TODAS');
                  setFiltroSetor('TODOS');
                }}
                className="text-xs text-blue-600 hover:underline font-bold px-2 py-1"
              >
                Limpar Filtros
              </button>
            )}

            {/* Selecionar todos filtrados */}
            {ferramentasFiltradas.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 cursor-pointer select-none ml-auto">
                <input
                  type="checkbox"
                  checked={
                    ferramentasFiltradas.length > 0 &&
                    ferramentasFiltradas.every((f) => selectedToolIds.has(f.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedToolIds(new Set(ferramentasFiltradas.map((f) => f.id)));
                    } else {
                      setSelectedToolIds(new Set());
                    }
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Selecionar filtradas ({ferramentasFiltradas.length})</span>
              </label>
            )}
          </div>
        </div>

        {/* Barra de Gestão em Lote Ativa */}
        {selectedToolIds.size > 0 && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {selectedToolIds.size}
              </div>
              <div>
                <span className="font-bold text-blue-900 text-xs">
                  {selectedToolIds.size} instrumento(s) selecionado(s)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedToolIds(new Set())}
                  className="text-[11px] text-blue-700 hover:text-blue-900 underline block font-medium"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleAbrirAcaoLote('INATIVAR')}
                className="px-2.5 py-1 text-xs font-semibold bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 rounded-lg shadow-2xs flex items-center gap-1 transition"
              >
                <Power className="w-3.5 h-3.5 text-amber-600" />
                <span>Inativar Selecionadas</span>
              </button>
              <button
                type="button"
                onClick={() => handleAbrirAcaoLote('REATIVAR')}
                className="px-2.5 py-1 text-xs font-semibold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 rounded-lg shadow-2xs flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Reativar Selecionadas</span>
              </button>
              <button
                type="button"
                onClick={() => handleAbrirAcaoLote('EXCLUIR')}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-2xs flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Permitidas</span>
              </button>
            </div>
          </div>
        )}

        {/* Mensagem de Feedback de Operação em Lote */}
        {sucessoLoteMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-2xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{sucessoLoteMsg}</span>
          </div>
        )}
      </div>

      {/* Tabela de Instrumentos */}
      <div className="bg-white border border-slate-200 rounded-[12px] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      ferramentasFiltradas.length > 0 &&
                      ferramentasFiltradas.every((f) => selectedToolIds.has(f.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedToolIds(new Set(ferramentasFiltradas.map((f) => f.id)));
                      } else {
                        setSelectedToolIds(new Set());
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-3.5">Tag / Patrimônio</th>
                <th className="p-3.5">Descrição do Instrumento</th>
                <th className="p-3.5">Fabricante & Modelo</th>
                <th className="p-3.5">Nº de Série</th>
                <th className="p-3.5">Última Calibração</th>
                <th className="p-3.5">Próxima Calibração</th>
                <th className="p-3.5">Certificado RBC</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center w-52">Ações Metrológicas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ferramentasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Nenhum instrumento encontrado com os filtros selecionados.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Adicione um novo instrumento ou importe uma planilha metrológica.
                    </p>
                  </td>
                </tr>
              ) : (
                ferramentasFiltradas.map((tool) => {
                  const isAtivo = tool.ativo !== false;
                  const isQuarentena = tool.status === 'QUARENTENA';
                  const isVencida = tool.status === 'VENCIDA' || isQuarentena;
                  const isProx = tool.status === 'PROXIMA_VENCIMENTO';
                  const isChecked = selectedToolIds.has(tool.id);

                  // Dias restantes
                  const hoje = new Date().toISOString().split('T')[0];
                  const diffMs = new Date(tool.dataProximaCalibracao).getTime() - new Date(hoje).getTime();
                  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                  return (
                    <tr
                      key={tool.id}
                      className={`transition ${
                        isChecked
                          ? 'bg-blue-50/50'
                          : !isAtivo
                          ? 'bg-slate-50/70 opacity-60'
                          : isQuarentena
                          ? 'bg-purple-50/40 hover:bg-purple-50/70'
                          : isVencida
                          ? 'bg-red-50/40 hover:bg-red-50/70'
                          : isProx
                          ? 'bg-amber-50/30 hover:bg-amber-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedToolIds);
                            if (e.target.checked) next.add(tool.id);
                            else next.delete(tool.id);
                            setSelectedToolIds(next);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{tool.codigoPatrimonio}</span>
                          {!isAtivo && (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                              INATIVO
                            </span>
                          )}
                        </div>
                        {tool.tolerancia && (
                          <div className="text-[10px] text-slate-500 font-sans font-normal truncate max-w-[120px]">
                            Tol: {tool.tolerancia}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-800">
                        <div className="font-bold text-slate-900">{tool.descricao}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {tool.setor || 'Hangar Geral'}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-700">
                        <div className="font-semibold">{tool.fabricante}</div>
                        {tool.modelo && <div className="text-[11px] text-slate-500">{tool.modelo}</div>}
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-700">{tool.numeroSerie}</td>

                      <td className="p-3.5 text-slate-600 whitespace-nowrap">{tool.dataUltimaCalibracao}</td>

                      <td className="p-3.5 whitespace-nowrap font-bold">
                        <div className={isQuarentena ? 'text-purple-700' : isVencida ? 'text-red-700' : isProx ? 'text-amber-800' : 'text-slate-900'}>
                          {tool.dataProximaCalibracao}
                        </div>
                        <div className="text-[10px] font-normal">
                          {isQuarentena ? (
                            <span className="text-purple-700 font-bold">Bloqueio Quarentena</span>
                          ) : diffDias < 0 ? (
                            <span className="text-red-600 font-bold">Vencida há {Math.abs(diffDias)}d</span>
                          ) : diffDias <= 30 ? (
                            <span className="text-amber-700 font-bold">Vence em {diffDias}d</span>
                          ) : (
                            <span className="text-slate-500">Válida por {diffDias}d</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-700">
                        <div className="font-bold">{tool.numeroCertificado || '—'}</div>
                        <div className="text-[10px] text-slate-500 font-sans truncate max-w-[140px]">
                          {tool.laboratorioCalibrador}
                        </div>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        {isQuarentena ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                            <Ban className="w-3 h-3" />
                            QUARENTENA
                          </span>
                        ) : isVencida ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                            <Ban className="w-3 h-3" />
                            VENCIDA
                          </span>
                        ) : isProx ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            EXPIRA EM BREVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            CALIBRADA
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button
                            onClick={() => {
                              setFerramentaParaCalibrar(tool);
                              setDadosNovaCalib({
                                data: new Date().toISOString().split('T')[0],
                                certificado: '',
                                laboratorio: tool.laboratorioCalibrador || '',
                                validadeAte: new Date(Date.now() + (tool.frequenciaMeses || 12) * 30 * 86400000)
                                  .toISOString()
                                  .split('T')[0],
                                observacao: '',
                              });
                              setModalNovaCalibracaoAberta(true);
                            }}
                            title="Registrar nova calibração periódica"
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3 text-emerald-600" />
                            Calibrar
                          </button>

                          <button
                            onClick={() => {
                              setFerramentaHistorico(tool);
                              setModalHistoricoAberta(true);
                            }}
                            title="Visualizar histórico metrológico RBC"
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setFerramentaOrigem(tool);
                            }}
                            title="Consultar origem e rastreabilidade cadastral"
                            className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setFerramentaEmEdicao(tool);
                              setModalEdicaoAberta(true);
                            }}
                            title="Editar dados cadastrais do instrumento"
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleAtivo(tool)}
                            title={isAtivo ? 'Inativar instrumento' : 'Reativar instrumento'}
                            className={`p-1 rounded transition cursor-pointer ${
                              isAtivo
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVO / EDITAR INSTRUMENTO */}
      {modalEdicaoAberta && ferramentaEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {ferramentaEmEdicao.id ? 'Editar Instrumento Calibrado' : 'Novo Instrumento de Precisão'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalEdicaoAberta(false);
                  setFerramentaEmEdicao(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarInstrumento} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tag / Patrimônio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TQ-045, MULT-012"
                    value={ferramentaEmEdicao.codigoPatrimonio || ''}
                    onChange={(e) =>
                      setFerramentaEmEdicao({ ...ferramentaEmEdicao, codigoPatrimonio: e.target.value.toUpperCase() })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Setor / Localização</label>
                  <input
                    type="text"
                    placeholder="Ex: Hangar 1 - Linha de Voo"
                    value={ferramentaEmEdicao.setor || ''}
                    onChange={(e) => setFerramentaEmEdicao({ ...ferramentaEmEdicao, setor: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Descrição do Instrumento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torquímetro de Estalo 20-100 Nm com Catraca 1/2"
                  value={ferramentaEmEdicao.descricao || ''}
                  onChange={(e) => setFerramentaEmEdicao({ ...ferramentaEmEdicao, descricao: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Gedore, Fluke, Snap-on"
                    value={ferramentaEmEdicao.fabricante || ''}
                    onChange={(e) => setFerramentaEmEdicao({ ...ferramentaEmEdicao, fabricante: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Dremometer A"
                    value={ferramentaEmEdicao.modelo || ''}
                    onChange={(e) => setFerramentaEmEdicao({ ...ferramentaEmEdicao, modelo: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Número de Série</label>
                  <input
                    type="text"
                    placeholder="Ex: SN-981247"
                    value={ferramentaEmEdicao.numeroSerie || ''}
                    onChange={(e) => setFerramentaEmEdicao({ ...ferramentaEmEdicao, numeroSerie: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Última Calibração</label>
                  <input
                    type="date"
                    value={ferramentaEmEdicao.dataUltimaCalibracao || ''}
                    onChange={(e) =>
                      setFerramentaEmEdicao({ ...ferramentaEmEdicao, dataUltimaCalibracao: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Próxima Calibração</label>
                  <input
                    type="date"
                    value={ferramentaEmEdicao.dataProximaCalibracao || ''}
                    onChange={(e) =>
                      setFerramentaEmEdicao({ ...ferramentaEmEdicao, dataProximaCalibracao: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Frequência (Meses)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={ferramentaEmEdicao.frequenciaMeses || 12}
                    onChange={(e) =>
                      setFerramentaEmEdicao({ ...ferramentaEmEdicao, frequenciaMeses: parseInt(e.target.value) || 12 })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Certificado RBC</label>
                  <input
                    type="text"
                    placeholder="Ex: CERT-RBC-2026/089"
                    value={ferramentaEmEdicao.numeroCertificado || ''}
                    onChange={(e) =>
                      setFerramentaEmEdicao({ ...ferramentaEmEdicao, numeroCertificado: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Laboratório Calibrador</label>
                  <input
                    type="text"
                    placeholder="Ex: LabMetrologia RBC nº 0124"
                    value={ferramentaEmEdicao.laboratorioCalibrador || ''}
                    onChange={(e) =>
                      setFerramentaEmEdicao({ ...ferramentaEmEdicao, laboratorioCalibrador: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tolerância / Faixa de Medição</label>
                <input
                  type="text"
                  placeholder="Ex: ± 4% leitura (20 a 100 Nm)"
                  value={ferramentaEmEdicao.tolerancia || ''}
                  onChange={(e) => setFerramentaEmEdicao({ ...ferramentaEmEdicao, tolerancia: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalEdicaoAberta(false);
                    setFerramentaEmEdicao(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  {salvando ? 'Salvando...' : 'Salvar Instrumento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NOVA CALIBRAÇÃO */}
      {modalNovaCalibracaoAberta && ferramentaParaCalibrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar Calibração</h3>
                  <span className="text-[11px] font-mono text-blue-700 font-bold">
                    {ferramentaParaCalibrar.codigoPatrimonio} — {ferramentaParaCalibrar.descricao}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalNovaCalibracaoAberta(false);
                  setFerramentaParaCalibrar(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaCalibracao} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Data da Calibração <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dadosNovaCalib.data}
                    onChange={(e) => setDadosNovaCalib({ ...dadosNovaCalib, data: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nova Validade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dadosNovaCalib.validadeAte}
                    onChange={(e) => setDadosNovaCalib({ ...dadosNovaCalib, validadeAte: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Número do Certificado RBC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CAL-RBC-2026-987"
                  value={dadosNovaCalib.certificado}
                  onChange={(e) => setDadosNovaCalib({ ...dadosNovaCalib, certificado: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Laboratório Acreditado RBC</label>
                <input
                  type="text"
                  placeholder="Ex: TecnoMetrologia Homologada Inmetro"
                  value={dadosNovaCalib.laboratorio}
                  onChange={(e) => setDadosNovaCalib({ ...dadosNovaCalib, laboratorio: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observações / Incerteza</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Aprovado conforme norma ISO 6789. Incerteza de medição: 0,8%."
                  value={dadosNovaCalib.observacao}
                  onChange={(e) => setDadosNovaCalib({ ...dadosNovaCalib, observacao: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalNovaCalibracaoAberta(false);
                    setFerramentaParaCalibrar(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {salvando ? 'Registrando...' : 'Confirmar Calibração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO METROLÓGICO */}
      {modalHistoricoAberta && ferramentaHistorico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Histórico de Calibrações RBC</h3>
                  <span className="text-xs text-slate-500">
                    {ferramentaHistorico.codigoPatrimonio} — {ferramentaHistorico.descricao} (Série:{' '}
                    {ferramentaHistorico.numeroSerie})
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalHistoricoAberta(false);
                  setFerramentaHistorico(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Registro Vigente Atual */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase">Calibração Vigente</span>
                  <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">Atual</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-slate-500">Certificado RBC:</span>
                    <p className="font-mono font-bold text-slate-900">{ferramentaHistorico.numeroCertificado || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Laboratório:</span>
                    <p className="font-bold text-slate-900">{ferramentaHistorico.laboratorioCalibrador}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Data da Calibração:</span>
                    <p className="font-bold text-slate-900">{ferramentaHistorico.dataUltimaCalibracao}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Validade Até:</span>
                    <p className="font-bold text-slate-900">{ferramentaHistorico.dataProximaCalibracao}</p>
                  </div>
                </div>
              </div>

              {/* Histórico Anterior */}
              <h4 className="text-xs font-bold text-slate-700 pt-2">Aferições e Calibrações Anteriores</h4>
              {!ferramentaHistorico.historicoCalibracoes || ferramentaHistorico.historicoCalibracoes.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-50 rounded-lg">
                  Nenhum registro histórico anterior arquivado para este instrumento.
                </p>
              ) : (
                <div className="space-y-2">
                  {ferramentaHistorico.historicoCalibracoes.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">Certificado: {item.certificado}</span>
                        <span className="text-[10px] text-slate-500">{item.data}</span>
                      </div>
                      <div className="text-slate-600 flex items-center justify-between text-[11px]">
                        <span>Lab: {item.laboratorio}</span>
                        <span>Válido até: {item.validadeAte}</span>
                      </div>
                      {item.observacao && <div className="text-[11px] text-slate-500 italic">{item.observacao}</div>}
                      {item.registradoPor && (
                        <div className="text-[10px] text-slate-400">Registrado por: {item.registradoPor}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setModalHistoricoAberta(false);
                  setFerramentaHistorico(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORIGEM E RASTREABILIDADE CADASTRAL DO INSTRUMENTO */}
      {ferramentaOrigem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Origem & Rastreabilidade Cadastral</h3>
              </div>
              <button
                onClick={() => setFerramentaOrigem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{ferramentaOrigem.descricao}</span>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {ferramentaOrigem.codigoPatrimonio}
                  </span>
                </div>
                <p className="text-slate-600">
                  {ferramentaOrigem.fabricante} {ferramentaOrigem.modelo && `• ${ferramentaOrigem.modelo}`} • Série: {ferramentaOrigem.numeroSerie || 'S/N'}
                </p>
                <p className="text-slate-500 text-[11px]">Setor / Localização: {ferramentaOrigem.setor || 'Hangar Geral'}</p>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="p-3 flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-700 block">Canal de Entrada / Origem</span>
                    <span className="text-slate-500 text-[11px]">
                      {(ferramentaOrigem.observacoes && ferramentaOrigem.observacoes.toLowerCase().includes('smart import')) ||
                      (ferramentaOrigem as any).origemImportacao
                        ? 'Importado via Smart Import (Planilha Metrológica homologada)'
                        : 'Cadastro Manual no Módulo Operacional de Metrologia'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {(ferramentaOrigem.observacoes && ferramentaOrigem.observacoes.toLowerCase().includes('smart import')) ||
                    (ferramentaOrigem as any).origemImportacao
                      ? 'Smart Import'
                      : 'Manual'}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Coleção Firestore</span>
                  <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">
                    organizations/{orgId}/calibrated_tools/{ferramentaOrigem.id}
                  </code>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Data de Cadastro Inicial</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    {ferramentaOrigem.criadoEm ? new Date(ferramentaOrigem.criadoEm).toLocaleString('pt-BR') : 'Data inicial do sistema'}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Última Atualização Registrada</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    {ferramentaOrigem.atualizadoEm ? new Date(ferramentaOrigem.atualizadoEm).toLocaleString('pt-BR') : 'Sem alterações recentes'}
                  </span>
                </div>

                <div className="p-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Calibrações Registradas no Histórico</span>
                  <span className="text-slate-800 font-bold">
                    {ferramentaOrigem.historicoCalibracoes?.length || 0} calibração(ões)
                  </span>
                </div>

                {ferramentaOrigem.observacoes && (
                  <div className="p-3 space-y-1">
                    <span className="font-semibold text-slate-700 block">Observações & Anotações de Rastreabilidade</span>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 text-[11px] leading-relaxed">
                      {ferramentaOrigem.observacoes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {onNavigateToTab && (
                <button
                  onClick={() => {
                    setFerramentaOrigem(null);
                    onNavigateToTab('importacao-inteligente');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ver Gateway Smart Import</span>
                </button>
              )}
              <button
                onClick={() => setFerramentaOrigem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REUTILIZÁVEL DE GESTÃO EM LOTE (Fase Corretiva Integrada) */}
      {analiseLote && (
        <BulkActionModal
          isOpen={modalLoteAberto}
          onClose={() => setModalLoteAberto(false)}
          tipoEntidade="FERRAMENTA"
          acao={acaoLote}
          analise={analiseLote}
          onConfirmar={handleConfirmarAcaoLote}
        />
      )}
    </div>
  );
};
