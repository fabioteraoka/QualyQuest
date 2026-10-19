import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  Layers,
  Printer,
  ShieldAlert,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { CursoCatalogo, ItemStatus, Licenca, Pessoa, Treinamento } from '../types';
import {
  AERONAVE_PARA_FROTAS,
  calcularStatusLicenca,
  calcularStatusTreinamento,
  conferirDesignacao,
  formatarDataBr,
  getStatusColor,
  piorStatus,
} from '../utils/businessRules';

interface DrilldownItem {
  pessoaNome: string;
  itemTipo: string;
  descricao: string;
  vencimento: string | null;
  dias: number | null;
  status: ItemStatus;
}

export const DashboardView: React.FC = () => {
  const {
    db,
    filtroBase,
    filtroCategoria,
    filtroSituacao,
    buscaGlobal,
    dataReferencia,
    faixas,
    navigateToFicha,
    setActiveTab,
    setFiltroBase,
    triggerPrint,
    loadEmbeddedOfficial,
    isLoadingEmbedded,
  } = useApp();

  const [drilldownModal, setDrilldownModal] = useState<{
    titulo: string;
    items: DrilldownItem[];
  } | null>(null);

  // Filtered persons based on global filters
  const filteredPessoas = useMemo(() => {
    return db.pessoas.filter((p) => {
      // Base filter: if not TOTAL, check if person's base_principal or designacao_base matches
      if (filtroBase !== 'TOTAL') {
        const matchesPrincipal = p.base_principal_id === filtroBase;
        const matchesDesignacao = db.designacoesBase.some(
          (dbItem) => dbItem.pessoa_id === p.id && dbItem.base_id === filtroBase
        );
        if (!matchesPrincipal && !matchesDesignacao) return false;
      }

      // Categoria filter
      if (filtroCategoria !== 'Todos' && p.categoria !== filtroCategoria) {
        return false;
      }

      // Situacao filter
      if (filtroSituacao !== 'Todos' && p.situacao !== filtroSituacao) {
        return false;
      }

      // Search filter
      if (buscaGlobal.trim()) {
        const q = buscaGlobal.toLowerCase();
        const matches =
          p.nome.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.canac.includes(q) ||
          p.cliente_ou_area.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [db.pessoas, db.designacoesBase, filtroBase, filtroCategoria, filtroSituacao, buscaGlobal]);

  const cursosMap = useMemo(() => {
    const map = new Map<string, CursoCatalogo>();
    db.cursosCatalogo.forEach((c) => map.set(c.id, c));
    return map;
  }, [db.cursosCatalogo]);

  // Compute status for all licenses and trainings for each person
  const pessoasCalculadas = useMemo(() => {
    return filteredPessoas.map((p) => {
      const licencasPessoa = db.licencas.filter((l) => l.pessoa_id === p.id);
      const treinamentosPessoa = db.treinamentos.filter((t) => t.pessoa_id === p.id && !t.substituido_por);

      // CHT ANAC
      const chtCel = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'CEL');
      const chtGmp = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'GMP');
      const chtAvi = licencasPessoa.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'AVI');

      const statusCel = chtCel ? calcularStatusLicenca(chtCel, dataReferencia, db.configuracao) : 'Sem registro';
      const statusGmp = chtGmp ? calcularStatusLicenca(chtGmp, dataReferencia, db.configuracao) : 'Sem registro';
      const statusAvi = chtAvi ? calcularStatusLicenca(chtAvi, dataReferencia, db.configuracao) : 'Sem registro';

      const statusAnacList: ItemStatus[] = [];
      if (chtCel) statusAnacList.push(statusCel);
      if (chtGmp) statusAnacList.push(statusGmp);
      if (chtAvi) statusAnacList.push(statusAvi);

      const piorAnac = statusAnacList.length > 0 ? piorStatus(statusAnacList) : 'Sem registro';

      // Treinamentos counts & worst status
      let trnVencidos = 0;
      let trnFaixa1 = 0;
      let trnFaixa2 = 0;
      let trnFaixa3 = 0;
      let trnEmDia = 0;
      let trnSemVenc = 0;
      const todosTreinamentosStatus: ItemStatus[] = [];

      treinamentosPessoa.forEach((t) => {
        const c = cursosMap.get(t.curso_id);
        const { status } = calcularStatusTreinamento(t, c, dataReferencia, db.configuracao);
        todosTreinamentosStatus.push(status);

        if (status === 'Vencido') trnVencidos++;
        else if (status.startsWith('Vence ≤') && (status.includes('30') || status.endsWith('1d'))) trnFaixa1++;
        else if (status.startsWith('Vence ≤') && (status.includes('60') || status.endsWith('2d'))) trnFaixa2++;
        else if (status.startsWith('Vence ≤')) trnFaixa3++;
        else if (status === 'Em dia') trnEmDia++;
        else if (status === 'Sem vencimento') trnSemVenc++;
      });

      const piorTreinamento = piorStatus(todosTreinamentosStatus);

      // Situacao Geral: pior entre ANAC e Treinamentos
      const listaGeral: ItemStatus[] = [];
      if (piorAnac !== 'Sem registro') listaGeral.push(piorAnac);
      if (piorTreinamento !== 'Sem registro') listaGeral.push(piorTreinamento);
      const situacaoGeral = piorStatus(listaGeral);

      const hasChtVencida = piorAnac === 'Vencido';
      const hasTreinamentoVencido = trnVencidos > 0;
      const is100EmDia =
        (piorAnac === 'Em dia' || piorAnac === 'Sem vencimento' || piorAnac === 'Sem registro') &&
        (piorTreinamento === 'Em dia' || piorTreinamento === 'Sem vencimento' || piorTreinamento === 'Sem registro') &&
        trnVencidos === 0 &&
        trnFaixa1 === 0;

      return {
        pessoa: p,
        chtCel,
        chtGmp,
        chtAvi,
        statusCel,
        statusGmp,
        statusAvi,
        piorAnac,
        totalTreinamentos: treinamentosPessoa.length,
        trnVencidos,
        trnFaixa1,
        trnFaixa2,
        trnFaixa3,
        trnEmDia,
        trnSemVenc,
        piorTreinamento,
        situacaoGeral,
        hasChtVencida,
        hasTreinamentoVencido,
        is100EmDia,
      };
    });
  }, [filteredPessoas, db.licencas, db.treinamentos, cursosMap, dataReferencia, db.configuracao]);

  // Designation Alerts KPI
  const totalAlertasDesignacao = useMemo(() => {
    let alertas = 0;
    const aeronavesLista: Array<keyof typeof AERONAVE_PARA_FROTAS> = [
      'B737',
      'E190E2',
      'A320FAM',
      'A330',
      'B767',
      'B777',
    ];

    filteredPessoas.forEach((p) => {
      aeronavesLista.forEach((aero) => {
        const desig = db.designacoesAeronave.find((da) => da.pessoa_id === p.id && da.aeronave === aero);
        if (desig?.valor === 'SIM') {
          const res = conferirDesignacao(
            p.id,
            aero,
            'SIM',
            db.treinamentos,
            cursosMap,
            dataReferencia,
            db.configuracao
          );
          if (res === 'Vencido' || res === 'Sem registro') {
            alertas++;
          }
        }
      });
    });

    return alertas;
  }, [filteredPessoas, db.designacoesAeronave, db.treinamentos, cursosMap, dataReferencia, db.configuracao]);

  // Aggregate KPI stats
  const kpiStats = useMemo(() => {
    const totalAtivos = pessoasCalculadas.filter((p) => p.pessoa.situacao === 'Ativo').length;
    const comChtVencida = pessoasCalculadas.filter((p) => p.hasChtVencida).length;
    const comTreinamentoVencido = pessoasCalculadas.filter((p) => p.hasTreinamentoVencido).length;
    const cemPorCentoEmDia = pessoasCalculadas.filter((p) => p.is100EmDia).length;

    return {
      totalAtivos,
      comChtVencida,
      comTreinamentoVencido,
      cemPorCentoEmDia,
      totalAlertasDesignacao,
    };
  }, [pessoasCalculadas, totalAlertasDesignacao]);

  // Item Type Summary breakdown (Licenças ANAC CHT, Treinamentos Frota, Treinamentos Doutrinação)
  const resumoPorTipo = useMemo(() => {
    const tipos = [
      { id: 'anac_cht', label: 'Licenças ANAC (CHT)' },
      { id: 'frota', label: 'Treinamentos de Frota' },
      { id: 'doutrinacao', label: 'Treinamentos de Doutrinação' },
    ];

    return tipos.map((t) => {
      let vencidos = 0;
      let faixa1 = 0;
      let faixa2 = 0;
      let faixa3 = 0;
      let emDia = 0;
      let semVenc = 0;
      let total = 0;

      const drillVencidos: DrilldownItem[] = [];
      const drillFaixa1: DrilldownItem[] = [];
      const drillFaixa2: DrilldownItem[] = [];
      const drillFaixa3: DrilldownItem[] = [];
      const drillEmDia: DrilldownItem[] = [];

      filteredPessoas.forEach((p) => {
        if (t.id === 'anac_cht') {
          const lics = db.licencas.filter((l) => l.pessoa_id === p.id && l.orgao === 'ANAC' && l.tipo === 'CHT');
          lics.forEach((l) => {
            total++;
            const s = calcularStatusLicenca(l, dataReferencia, db.configuracao);
            const item: DrilldownItem = {
              pessoaNome: p.nome,
              itemTipo: `Licença ANAC CHT ${l.habilitacao || ''}`,
              descricao: `Nº ${l.numero}`,
              vencimento: l.data_vencimento,
              dias: l.data_vencimento ? Math.round((new Date(l.data_vencimento).getTime() - new Date(dataReferencia).getTime()) / (1000 * 3600 * 24)) : null,
              status: s,
            };

            if (s === 'Vencido') {
              vencidos++;
              drillVencidos.push(item);
            } else if (s.startsWith('Vence ≤') && (s.includes('30') || s.endsWith('1d'))) {
              faixa1++;
              drillFaixa1.push(item);
            } else if (s.startsWith('Vence ≤') && (s.includes('60') || s.endsWith('2d'))) {
              faixa2++;
              drillFaixa2.push(item);
            } else if (s.startsWith('Vence ≤')) {
              faixa3++;
              drillFaixa3.push(item);
            } else if (s === 'Em dia') {
              emDia++;
              drillEmDia.push(item);
            } else {
              semVenc++;
            }
          });
        } else {
          const grupoFiltro = t.id === 'frota' ? 'Frota' : 'Doutrinação';
          const trns = db.treinamentos.filter((trn) => {
            if (trn.pessoa_id !== p.id || trn.substituido_por) return false;
            const c = cursosMap.get(trn.curso_id);
            return c && c.grupo === grupoFiltro;
          });

          trns.forEach((trn) => {
            total++;
            const c = cursosMap.get(trn.curso_id);
            const { status, data_vencimento, dias_para_vencer } = calcularStatusTreinamento(
              trn,
              c,
              dataReferencia,
              db.configuracao
            );

            const item: DrilldownItem = {
              pessoaNome: p.nome,
              itemTipo: `${c?.grupo || ''} - ${c?.variante || c?.frota || ''}`,
              descricao: c?.curso || trn.curso_id,
              vencimento: data_vencimento,
              dias: dias_para_vencer,
              status,
            };

            if (status === 'Vencido') {
              vencidos++;
              drillVencidos.push(item);
            } else if (status.startsWith('Vence ≤') && (status.includes('30') || status.endsWith('1d'))) {
              faixa1++;
              drillFaixa1.push(item);
            } else if (status.startsWith('Vence ≤') && (status.includes('60') || status.endsWith('2d'))) {
              faixa2++;
              drillFaixa2.push(item);
            } else if (status.startsWith('Vence ≤')) {
              faixa3++;
              drillFaixa3.push(item);
            } else if (status === 'Em dia') {
              emDia++;
              drillEmDia.push(item);
            } else {
              semVenc++;
            }
          });
        }
      });

      return {
        ...t,
        vencidos,
        faixa1,
        faixa2,
        faixa3,
        emDia,
        semVenc,
        total,
        drills: {
          vencidos: drillVencidos,
          faixa1: drillFaixa1,
          faixa2: drillFaixa2,
          faixa3: drillFaixa3,
          emDia: drillEmDia,
        },
      };
    });
  }, [filteredPessoas, db.licencas, db.treinamentos, cursosMap, dataReferencia, db.configuracao]);

  // Breakdown by Fleet/Variant (12 variants)
  const variantesLista = [
    'B737 CLASSIC 3/4/5',
    'B737 NG',
    'B737 MAX',
    'B747-400',
    'B747-800',
    'B767',
    'B777',
    'A320F / 321',
    'A320F / 321 NEO',
    'A330',
    'A330 NEO',
    'E190E2',
  ];

  const situacaoPorVariante = useMemo(() => {
    return variantesLista.map((variante) => {
      let vencidos = 0;
      let faixa1 = 0;
      let faixa2 = 0;
      let faixa3 = 0;
      let emDia = 0;
      let semVenc = 0;
      let total = 0;

      filteredPessoas.forEach((p) => {
        const trns = db.treinamentos.filter((trn) => {
          if (trn.pessoa_id !== p.id || trn.substituido_por) return false;
          const c = cursosMap.get(trn.curso_id);
          return c && c.variante === variante;
        });

        trns.forEach((trn) => {
          total++;
          const c = cursosMap.get(trn.curso_id);
          const { status } = calcularStatusTreinamento(trn, c, dataReferencia, db.configuracao);
          if (status === 'Vencido') vencidos++;
          else if (status.startsWith('Vence ≤') && (status.includes('30') || status.endsWith('1d'))) faixa1++;
          else if (status.startsWith('Vence ≤') && (status.includes('60') || status.endsWith('2d'))) faixa2++;
          else if (status.startsWith('Vence ≤')) faixa3++;
          else if (status === 'Em dia') emDia++;
          else semVenc++;
        });
      });

      return {
        variante,
        vencidos,
        faixa1,
        faixa2,
        faixa3,
        emDia,
        semVenc,
        total,
      };
    });
  }, [filteredPessoas, db.treinamentos, cursosMap, dataReferencia, db.configuracao]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar with Action Shortcuts */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Dashboard Executivo do Roster</span>
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Base: {filtroBase} · Ref: {formatarDataBr(dataReferencia)}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão consolidada de prontidão técnica, licenças ANAC/FAA e conformidade de frotas.
          </p>
        </div>

        {/* Quick Report Print Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('designacao')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-900 bg-sky-50 border border-sky-300 rounded-md hover:bg-sky-100 transition-colors cursor-pointer shadow-2xs"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-sky-700" />
            <span>Lista de Designação (Oficial)</span>
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>Relatório do Roster</span>
          </button>
        </div>
      </div>

      {/* Empty Database State Card */}
      {db.pessoas.length === 0 && (
        <div className="bg-white border-2 border-dashed border-sky-300 rounded-xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-sky-50 text-sky-800 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h2 className="text-base font-bold text-slate-900">
              Banco de dados pronto para receber o Roster Oficial
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              O sistema foi inicializado com estrutura relacional normalizada e catálogos padrão. Carregue o arquivo oficial com os 32 mecânicos e frotas da organização para visualizar os indicadores operacionais.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={loadEmbeddedOfficial}
              disabled={isLoadingEmbedded}
              className="px-4 py-2 bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>{isLoadingEmbedded ? 'Carregando dados...' : 'Carregar dados oficiais embutidos'}</span>
            </button>
            <button
              onClick={() => setActiveTab('importar')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Importar arquivo (.json ou .xlsx)</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Mecânicos Ativos */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Mecânicos Ativos</span>
            <Users className="w-4 h-4 text-sky-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {kpiStats.totalAtivos}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              de {db.pessoas.length} cadastrados
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Filtrados por base: {filtroBase}
          </div>
        </div>

        {/* KPI 2: CHT ANAC Vencida */}
        <div
          onClick={() => {
            const list = pessoasCalculadas.filter((p) => p.hasChtVencida);
            setDrilldownModal({
              titulo: 'Mecânicos com CHT ANAC Vencida',
              items: list.map((p) => ({
                pessoaNome: p.pessoa.nome,
                itemTipo: 'ANAC CHT',
                descricao: `CANAC: ${p.pessoa.canac || 'N/D'} · CEL/GMP`,
                vencimento: p.chtCel?.data_vencimento || p.chtGmp?.data_vencimento || null,
                dias: null,
                status: 'Vencido',
              })),
            });
          }}
          className="bg-white p-4 rounded-lg border border-red-200 shadow-2xs flex flex-col justify-between hover:border-red-400 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-red-700 text-xs font-semibold">
            <span>Com CHT/ANAC Vencida</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-red-700 tabular-nums">
              {kpiStats.comChtVencida}
            </span>
            <span className="text-[11px] text-red-600/80 font-medium">
              {kpiStats.comChtVencida === 2 ? '2 mecânicos (Critério)' : 'críticos'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-red-50 text-[10px] text-red-600 flex items-center justify-between">
            <span>Claudio Jair &amp; Franco</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* KPI 3: Com Treinamento Vencido */}
        <div
          onClick={() => {
            const list = pessoasCalculadas.filter((p) => p.hasTreinamentoVencido);
            setDrilldownModal({
              titulo: 'Mecânicos com Treinamentos Vencidos',
              items: list.map((p) => ({
                pessoaNome: p.pessoa.nome,
                itemTipo: 'Treinamentos',
                descricao: `${p.trnVencidos} cursos com validade expirada`,
                vencimento: null,
                dias: null,
                status: 'Vencido',
              })),
            });
          }}
          className="bg-white p-4 rounded-lg border border-amber-200 shadow-2xs flex flex-col justify-between hover:border-amber-400 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>Com Treinamento Vencido</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-800 tabular-nums">
              {kpiStats.comTreinamentoVencido}
            </span>
            <span className="text-[11px] text-amber-700/80 font-medium">mecânicos</span>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-50 text-[10px] text-amber-700 flex items-center justify-between">
            <span>Ver detalhes</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* KPI 4: 100% Em Dia */}
        <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>100% Em Dia</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
              {kpiStats.cemPorCentoEmDia}
            </span>
            <span className="text-[11px] text-emerald-700/80 font-medium">prontos p/ voo</span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-50 text-[10px] text-emerald-700">
            Sem nenhuma pendência ≤30d
          </div>
        </div>

        {/* KPI 5: Alertas de Designação */}
        <div
          onClick={() => setActiveTab('conferencia')}
          className={`bg-white p-4 rounded-lg border shadow-2xs flex flex-col justify-between cursor-pointer transition-colors ${
            kpiStats.totalAlertasDesignacao > 0
              ? 'border-orange-300 hover:border-orange-500'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-orange-900">
            <span>Alertas de Conformidade</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-orange-950 tabular-nums">
              {kpiStats.totalAlertasDesignacao}
            </span>
            <span className="text-[11px] text-orange-800 font-medium">designados s/ curso</span>
          </div>
          <div className="mt-2 pt-2 border-t border-orange-100 text-[10px] text-orange-800 flex items-center justify-between">
            <span>Conferência Frota × Roster</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns (Resumo por Tipo + Distribuição por Frota) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Resumo por Tipo de Item */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-800" />
              <span>Resumo por Tipo de Item</span>
            </div>
            <span className="text-[11px] text-slate-500 font-normal">
              Clique nos números para abrir a lista
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Tipo de Item</th>
                  <th className="py-2.5 px-2 text-center text-red-900 bg-red-50/50">Vencido</th>
                  <th className="py-2.5 px-2 text-center text-orange-900 bg-orange-50/50">
                    ≤{faixas.faixa_1}d
                  </th>
                  <th className="py-2.5 px-2 text-center text-yellow-900 bg-yellow-50/50">
                    ≤{faixas.faixa_2}d
                  </th>
                  <th className="py-2.5 px-2 text-center text-amber-900 bg-amber-50/50">
                    ≤{faixas.faixa_3}d
                  </th>
                  <th className="py-2.5 px-2 text-center text-emerald-900 bg-emerald-50/50">Em dia</th>
                  <th className="py-2.5 px-3 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumoPorTipo.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{row.label}</td>

                    {/* Vencidos */}
                    <td className="py-2 px-2 text-center font-mono tabular-nums">
                      {row.vencidos > 0 ? (
                        <button
                          onClick={() =>
                            setDrilldownModal({
                              titulo: `${row.label} - Vencidos (${row.vencidos})`,
                              items: row.drills.vencidos,
                            })
                          }
                          className="px-2 py-0.5 rounded font-bold text-red-900 bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
                        >
                          {row.vencidos}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Faixa 1 */}
                    <td className="py-2 px-2 text-center font-mono tabular-nums">
                      {row.faixa1 > 0 ? (
                        <button
                          onClick={() =>
                            setDrilldownModal({
                              titulo: `${row.label} - Vencem em ≤${faixas.faixa_1} dias (${row.faixa1})`,
                              items: row.drills.faixa1,
                            })
                          }
                          className="px-2 py-0.5 rounded font-bold text-orange-900 bg-orange-100 hover:bg-orange-200 transition-colors cursor-pointer"
                        >
                          {row.faixa1}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Faixa 2 */}
                    <td className="py-2 px-2 text-center font-mono tabular-nums">
                      {row.faixa2 > 0 ? (
                        <button
                          onClick={() =>
                            setDrilldownModal({
                              titulo: `${row.label} - Vencem em ≤${faixas.faixa_2} dias (${row.faixa2})`,
                              items: row.drills.faixa2,
                            })
                          }
                          className="px-2 py-0.5 rounded font-bold text-yellow-900 bg-yellow-100 hover:bg-yellow-200 transition-colors cursor-pointer"
                        >
                          {row.faixa2}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Faixa 3 */}
                    <td className="py-2 px-2 text-center font-mono tabular-nums">
                      {row.faixa3 > 0 ? (
                        <button
                          onClick={() =>
                            setDrilldownModal({
                              titulo: `${row.label} - Vencem em ≤${faixas.faixa_3} dias (${row.faixa3})`,
                              items: row.drills.faixa3,
                            })
                          }
                          className="px-2 py-0.5 rounded font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors cursor-pointer"
                        >
                          {row.faixa3}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Em dia */}
                    <td className="py-2 px-2 text-center font-mono tabular-nums">
                      {row.emDia > 0 ? (
                        <button
                          onClick={() =>
                            setDrilldownModal({
                              titulo: `${row.label} - Em Dia (${row.emDia})`,
                              items: row.drills.emDia,
                            })
                          }
                          className="px-2 py-0.5 rounded font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 transition-colors cursor-pointer"
                        >
                          {row.emDia}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Situação por Frota / Variante */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-800" />
              <span>Situação por Frota &amp; Variante (12 Variantes)</span>
            </div>
            <button
              onClick={() => setActiveTab('matrizes')}
              className="text-xs text-sky-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Ver Matriz</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-3">Variante da Aeronave</th>
                  <th className="py-2 px-2 text-center text-red-900 bg-red-50/50">Venc.</th>
                  <th className="py-2 px-2 text-center text-orange-900 bg-orange-50/50">≤30d</th>
                  <th className="py-2 px-2 text-center text-emerald-900 bg-emerald-50/50">Em dia</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3 text-center">Distribuição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {situacaoPorVariante.map((v) => {
                  const pctEmDia = v.total > 0 ? (v.emDia / v.total) * 100 : 0;
                  const pctVenc = v.total > 0 ? (v.vencidos / v.total) * 100 : 0;
                  const pctAlerta =
                    v.total > 0 ? ((v.faixa1 + v.faixa2 + v.faixa3) / v.total) * 100 : 0;

                  return (
                    <tr key={v.variante} className="hover:bg-slate-50 transition-colors">
                      <td className="py-1.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {v.variante}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono tabular-nums">
                        {v.vencidos > 0 ? (
                          <span className="font-bold text-red-700">{v.vencidos}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono tabular-nums">
                        {v.faixa1 > 0 ? (
                          <span className="font-bold text-orange-700">{v.faixa1}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono tabular-nums">
                        {v.emDia > 0 ? (
                          <span className="font-bold text-emerald-700">{v.emDia}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">
                        {v.total}
                      </td>
                      <td className="py-1.5 px-3 w-32">
                        {v.total > 0 ? (
                          <div className="h-2 w-full bg-slate-200 rounded-full flex overflow-hidden">
                            <div
                              style={{ width: `${pctEmDia}%`, backgroundColor: '#C6E0B4' }}
                              title={`Em dia: ${v.emDia}`}
                            />
                            <div
                              style={{ width: `${pctAlerta}%`, backgroundColor: '#FFE699' }}
                              title={`A vencer: ${v.faixa1 + v.faixa2 + v.faixa3}`}
                            />
                            <div
                              style={{ width: `${pctVenc}%`, backgroundColor: '#F4B6B6' }}
                              title={`Vencidos: ${v.vencidos}`}
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 block text-center">
                            Sem cursos
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main Table: Situação de Cada Mecânico */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Situação Individual de Cada Mecânico</span>
              <span className="text-xs font-normal text-slate-500">
                ({pessoasCalculadas.length} listados)
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Clique em qualquer linha para abrir a Ficha Técnica Completa do mecânico.
            </p>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F4B6B6] inline-block" /> Vencido
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F8CBAD] inline-block" /> ≤30d
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C6E0B4] inline-block" /> Em dia
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Nome do Mecânico</th>
                <th className="py-2.5 px-2">Base / Área</th>
                <th className="py-2.5 px-2 text-center">CANAC</th>
                <th className="py-2.5 px-2 text-center">CHT CEL</th>
                <th className="py-2.5 px-2 text-center">CHT GMP</th>
                <th className="py-2.5 px-2 text-center">CHT AVI</th>
                <th className="py-2.5 px-2 text-center">Situação ANAC</th>
                <th className="py-2.5 px-2 text-center">Treinamentos</th>
                <th className="py-2.5 px-2 text-center text-red-900 bg-red-50/50">Venc.</th>
                <th className="py-2.5 px-2 text-center text-orange-900 bg-orange-50/50">≤30d</th>
                <th className="py-2.5 px-2 text-center text-emerald-900 bg-emerald-50/50">Em dia</th>
                <th className="py-2.5 px-3 text-center">Situação Geral</th>
                <th className="py-2.5 px-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pessoasCalculadas.map((item) => {
                const colorsCel = getStatusColor(item.statusCel);
                const colorsGmp = getStatusColor(item.statusGmp);
                const colorsAvi = getStatusColor(item.statusAvi);

                return (
                  <tr
                    key={item.pessoa.id}
                    onClick={() => navigateToFicha(item.pessoa.id)}
                    className="hover:bg-sky-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-500 whitespace-nowrap">
                      {item.pessoa.id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap group-hover:text-sky-900">
                      {item.pessoa.nome}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{item.pessoa.base_principal_id}</span>
                      {item.pessoa.cliente_ou_area && (
                        <span className="text-[10px] text-slate-400 block">
                          {item.pessoa.cliente_ou_area}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-600">
                      {item.pessoa.canac || '-'}
                    </td>

                    {/* CHT CEL Date colored */}
                    <td className="py-2 px-1 text-center font-mono text-[11px]">
                      {item.chtCel ? (
                        <span
                          style={{ backgroundColor: colorsCel.bg, color: colorsCel.text }}
                          className="px-1.5 py-0.5 rounded font-medium inline-block border border-black/10"
                        >
                          {formatarDataBr(item.chtCel.data_vencimento)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* CHT GMP Date colored */}
                    <td className="py-2 px-1 text-center font-mono text-[11px]">
                      {item.chtGmp ? (
                        <span
                          style={{ backgroundColor: colorsGmp.bg, color: colorsGmp.text }}
                          className="px-1.5 py-0.5 rounded font-medium inline-block border border-black/10"
                        >
                          {formatarDataBr(item.chtGmp.data_vencimento)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* CHT AVI Date colored */}
                    <td className="py-2 px-1 text-center font-mono text-[11px]">
                      {item.chtAvi ? (
                        <span
                          style={{ backgroundColor: colorsAvi.bg, color: colorsAvi.text }}
                          className="px-1.5 py-0.5 rounded font-medium inline-block border border-black/10"
                        >
                          {formatarDataBr(item.chtAvi.data_vencimento)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Situação ANAC (Pior) */}
                    <td className="py-2 px-2 text-center">
                      <StatusBadge status={item.piorAnac} size="sm" />
                    </td>

                    {/* Treinamentos Total */}
                    <td className="py-2 px-2 text-center font-mono font-medium text-slate-700">
                      {item.totalTreinamentos}
                    </td>

                    {/* Trn Vencidos */}
                    <td className="py-2 px-2 text-center font-mono tabular-nums font-semibold">
                      {item.trnVencidos > 0 ? (
                        <span className="text-red-700">{item.trnVencidos}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Trn Faixa 1 */}
                    <td className="py-2 px-2 text-center font-mono tabular-nums font-semibold">
                      {item.trnFaixa1 > 0 ? (
                        <span className="text-orange-700">{item.trnFaixa1}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Trn Em dia */}
                    <td className="py-2 px-2 text-center font-mono tabular-nums font-semibold">
                      {item.trnEmDia > 0 ? (
                        <span className="text-emerald-700">{item.trnEmDia}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Situação Geral */}
                    <td className="py-2 px-3 text-center">
                      <StatusBadge status={item.situacaoGeral} size="sm" />
                    </td>

                    {/* View Action */}
                    <td className="py-2 px-2 text-right">
                      <span className="text-sky-700 group-hover:underline text-[11px] font-medium inline-flex items-center gap-0.5">
                        <span>Ficha</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal */}
      {drilldownModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">{drilldownModal.titulo}</h3>
              <button
                onClick={() => setDrilldownModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto divide-y divide-slate-100">
              {drilldownModal.items.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Nenhum registro correspondente encontrado.
                </div>
              ) : (
                drilldownModal.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{item.pessoaNome}</div>
                      <div className="text-slate-500 text-[11px]">
                        {item.itemTipo} · {item.descricao}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.vencimento && (
                        <span className="font-mono text-[11px] text-slate-600">
                          Venc: {formatarDataBr(item.vencimento)}
                        </span>
                      )}
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setDrilldownModal(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
