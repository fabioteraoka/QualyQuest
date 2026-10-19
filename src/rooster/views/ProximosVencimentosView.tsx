import React, { useMemo, useState } from 'react';
import { Award, BookOpen, Clock, Download, Filter, MapPin, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { CursoCatalogo, ItemStatus } from '../types';
import {
  calcularDiasParaVencer,
  calcularStatusLicenca,
  calcularStatusTreinamento,
  formatarDataBr,
  getStatusColor,
} from '../utils/businessRules';

export const ProximosVencimentosView: React.FC = () => {
  const { db, filtroBase, setFiltroBase, dataReferencia, faixas, navigateToFicha, triggerPrint } = useApp();

  const [diasMaximos, setDiasMaximos] = useState<number>(faixas.faixa_3 || 90);
  const [incluirVencidos, setIncluirVencidos] = useState<boolean>(true);

  const cursosMap = useMemo(() => {
    const map = new Map<string, CursoCatalogo>();
    db.cursosCatalogo.forEach((c) => map.set(c.id, c));
    return map;
  }, [db.cursosCatalogo]);

  // Expiring Licenses
  const licencasExpirando = useMemo(() => {
    const list: Array<{
      pessoaId: string;
      pessoaNome: string;
      base: string;
      categoria: string;
      item: string;
      numero: string;
      vencimento: string;
      dias: number;
      status: ItemStatus;
    }> = [];

    db.licencas.forEach((l) => {
      if (!l.data_vencimento) return;
      const p = db.pessoas.find((p) => p.id === l.pessoa_id);
      if (!p || p.situacao !== 'Ativo') return;

      if (filtroBase !== 'TOTAL') {
        const basesPessoa = db.designacoesBase.filter((b) => b.pessoa_id === p.id).map((b) => b.base_id);
        const hasInDesignacao = basesPessoa.includes(filtroBase);
        const hasInPrincipal = basesPessoa.length === 0 && p.base_principal_id === filtroBase;
        if (!hasInDesignacao && !hasInPrincipal) return false;
      }

      const dias = calcularDiasParaVencer(l.data_vencimento, dataReferencia);
      if (dias === null) return;

      if (!incluirVencidos && dias < 0) return;
      if (dias > diasMaximos) return;

      const status = calcularStatusLicenca(l, dataReferencia, db.configuracao);

      list.push({
        pessoaId: p.id,
        pessoaNome: p.nome,
        base: p.base_principal_id,
        categoria: p.categoria,
        item: `${l.orgao} ${l.tipo} ${l.habilitacao || ''}`,
        numero: l.numero,
        vencimento: l.data_vencimento,
        dias,
        status,
      });
    });

    return list.sort((a, b) => a.dias - b.dias);
  }, [db.licencas, db.pessoas, db.designacoesBase, dataReferencia, db.configuracao, filtroBase, diasMaximos, incluirVencidos]);

  // Expiring Trainings
  const treinamentosExpirando = useMemo(() => {
    const list: Array<{
      pessoaId: string;
      pessoaNome: string;
      base: string;
      categoria: string;
      grupo: string;
      item: string;
      execucao: string;
      vencimento: string;
      dias: number;
      status: ItemStatus;
    }> = [];

    db.treinamentos.forEach((t) => {
      if (t.substituido_por) return;
      const p = db.pessoas.find((p) => p.id === t.pessoa_id);
      if (!p || p.situacao !== 'Ativo') return;

      if (filtroBase !== 'TOTAL') {
        const basesPessoa = db.designacoesBase.filter((b) => b.pessoa_id === p.id).map((b) => b.base_id);
        const hasInDesignacao = basesPessoa.includes(filtroBase);
        const hasInPrincipal = basesPessoa.length === 0 && p.base_principal_id === filtroBase;
        if (!hasInDesignacao && !hasInPrincipal) return false;
      }

      const c = cursosMap.get(t.curso_id);
      const { status, data_vencimento, dias_para_vencer } = calcularStatusTreinamento(
        t,
        c,
        dataReferencia,
        db.configuracao
      );

      if (!data_vencimento || dias_para_vencer === null) return;

      if (!incluirVencidos && dias_para_vencer < 0) return;
      if (dias_para_vencer > diasMaximos) return;

      list.push({
        pessoaId: p.id,
        pessoaNome: p.nome,
        base: p.base_principal_id,
        categoria: p.categoria,
        grupo: c?.grupo || 'Frota',
        item: c ? `${c.variante ? `${c.variante} - ` : ''}${c.curso}` : t.curso_id,
        execucao: t.data_execucao,
        vencimento: data_vencimento,
        dias: dias_para_vencer,
        status,
      });
    });

    return list.sort((a, b) => a.dias - b.dias);
  }, [db.treinamentos, db.pessoas, db.designacoesBase, cursosMap, dataReferencia, db.configuracao, filtroBase, diasMaximos, incluirVencidos]);

  const handleExportarExcel = () => {
    const wb = XLSX.utils.book_new();

    const wsLic = XLSX.utils.json_to_sheet(
      licencasExpirando.map((l) => ({
        Mecânico: l.pessoaNome,
        Base: l.base,
        Categoria: l.categoria,
        Habilitação: l.item,
        Número: l.numero,
        Vencimento: formatarDataBr(l.vencimento),
        Dias: l.dias,
        Status: l.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsLic, 'Licencas_A_Vencer');

    const wsTrn = XLSX.utils.json_to_sheet(
      treinamentosExpirando.map((t) => ({
        Mecânico: t.pessoaNome,
        Base: t.base,
        Categoria: t.categoria,
        Grupo: t.grupo,
        Curso: t.item,
        Execução: formatarDataBr(t.execucao),
        Vencimento: formatarDataBr(t.vencimento),
        Dias: t.dias,
        Status: t.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsTrn, 'Treinamentos_A_Vencer');

    XLSX.writeFile(wb, `Proximos_Vencimentos_${dataReferencia}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header and Controls */}
      <div className="no-print bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Próximos Vencimentos de Licenças e Treinamentos</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">
              Fila Cronológica
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoramento preventivo para planejamento de reciclagens e renovações prévias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Prazo Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-slate-700">Janela de Alerta:</span>
            <select
              value={diasMaximos}
              onChange={(e) => setDiasMaximos(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-900"
            >
              <option value={30}>Até 30 dias (Faixa 1)</option>
              <option value={60}>Até 60 dias (Faixa 2)</option>
              <option value={90}>Até 90 dias (Faixa 3)</option>
              <option value={180}>Até 180 dias</option>
              <option value={365}>Até 1 ano (365 dias)</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={incluirVencidos}
              onChange={(e) => setIncluirVencidos(e.target.checked)}
            />
            <span>Incluir Vencidos (&lt; 0 dias)</span>
          </label>

          <button
            onClick={handleExportarExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-sky-700" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Section 1: Licenças Vencendo */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-800" />
            <span>1. Licenças Oficiais ANAC / FAA a Vencer ({licencasExpirando.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Mecânico</th>
                <th className="py-2 px-2">Base</th>
                <th className="py-2 px-3">Habilitação</th>
                <th className="py-2 px-3">Número</th>
                <th className="py-2 px-3 text-center">Data de Vencimento</th>
                <th className="py-2 px-2 text-center">Dias Restantes</th>
                <th className="py-2 px-3 text-center">Situação</th>
                <th className="py-2 px-3 text-right no-print">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licencasExpirando.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 text-xs italic">
                    Nenhuma licença com vencimento na janela selecionada.
                  </td>
                </tr>
              ) : (
                licencasExpirando.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      <button
                        onClick={() => navigateToFicha(item.pessoaId)}
                        className="hover:underline hover:text-sky-900 text-left cursor-pointer"
                      >
                        {item.pessoaNome}
                      </button>
                    </td>
                    <td className="py-2 px-2 font-mono font-bold text-slate-700">{item.base}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{item.item}</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{item.numero}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">
                      {formatarDataBr(item.vencimento)}
                    </td>
                    <td className="py-2 px-2 text-center font-mono tabular-nums font-bold">
                      <span className={item.dias < 0 ? 'text-red-700' : 'text-orange-700'}>
                        {item.dias < 0 ? `Vencido há ${Math.abs(item.dias)}d` : `em ${item.dias}d`}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-2 px-3 text-right no-print">
                      <button
                        onClick={() => navigateToFicha(item.pessoaId)}
                        className="text-xs text-sky-700 font-semibold hover:underline cursor-pointer"
                      >
                        Abrir Ficha
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Treinamentos Vencendo */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-800" />
            <span>2. Treinamentos de Frota e Doutrinação a Vencer ({treinamentosExpirando.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Mecânico</th>
                <th className="py-2 px-2">Base</th>
                <th className="py-2 px-2">Grupo</th>
                <th className="py-2 px-3">Curso</th>
                <th className="py-2 px-2 text-center">Execução</th>
                <th className="py-2 px-3 text-center">Vencimento</th>
                <th className="py-2 px-2 text-center">Dias Restantes</th>
                <th className="py-2 px-3 text-center">Situação</th>
                <th className="py-2 px-3 text-right no-print">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {treinamentosExpirando.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400 text-xs italic">
                    Nenhum treinamento com vencimento na janela selecionada.
                  </td>
                </tr>
              ) : (
                treinamentosExpirando.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      <button
                        onClick={() => navigateToFicha(item.pessoaId)}
                        className="hover:underline hover:text-sky-900 text-left cursor-pointer"
                      >
                        {item.pessoaNome}
                      </button>
                    </td>
                    <td className="py-2 px-2 font-mono font-bold text-slate-700">{item.base}</td>
                    <td className="py-2 px-2 text-slate-600">{item.grupo}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{item.item}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-500">
                      {formatarDataBr(item.execucao)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold">
                      {formatarDataBr(item.vencimento)}
                    </td>
                    <td className="py-2 px-2 text-center font-mono tabular-nums font-bold">
                      <span className={item.dias < 0 ? 'text-red-700' : 'text-orange-700'}>
                        {item.dias < 0 ? `Vencido há ${Math.abs(item.dias)}d` : `em ${item.dias}d`}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-2 px-3 text-right no-print">
                      <button
                        onClick={() => navigateToFicha(item.pessoaId)}
                        className="text-xs text-sky-700 font-semibold hover:underline cursor-pointer"
                      >
                        Renovar na Ficha
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
