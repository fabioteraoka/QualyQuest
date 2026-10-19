import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Layers,
  MapPin,
  Printer,
  User,
  Users,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { CursoCatalogo, ItemStatus, Licenca, Pessoa, Treinamento } from '../types';
import {
  calcularDiasParaVencer,
  calcularStatusLicenca,
  calcularStatusTreinamento,
  formatarDataBr,
  getStatusColor,
  piorStatus,
} from '../utils/businessRules';

type VariacaoRelatorio = 'completo' | 'pendencias' | 'licencas';

export const RelatorioRosterView: React.FC = () => {
  const { db, filtroBase, setFiltroBase, filtroCategoria, dataReferencia, faixas, triggerPrint } = useApp();

  const [variacao, setVariacao] = useState<VariacaoRelatorio>('completo');

  const cursosMap = useMemo(() => {
    const map = new Map<string, CursoCatalogo>();
    db.cursosCatalogo.forEach((c) => map.set(c.id, c));
    return map;
  }, [db.cursosCatalogo]);

  const motoresMap = useMemo(() => {
    const map = new Map<string, string>();
    db.motoresCatalogo.forEach((m) => {
      map.set(m.id, m.modelo ? `${m.fabricante} ${m.modelo}` : m.fabricante);
    });
    return map;
  }, [db.motoresCatalogo]);

  // Filtered persons
  const filteredPessoas = useMemo(() => {
    return db.pessoas
      .filter((p) => {
        // Base filter
        if (filtroBase !== 'TOTAL') {
          const basesPessoa = db.designacoesBase
            .filter((dbItem) => dbItem.pessoa_id === p.id)
            .map((b) => b.base_id);
          const hasInDesignacao = basesPessoa.includes(filtroBase);
          const hasInPrincipal = basesPessoa.length === 0 && p.base_principal_id === filtroBase;
          if (!hasInDesignacao && !hasInPrincipal) return false;
        }

        // Categoria filter
        if (filtroCategoria !== 'Todos' && p.categoria !== filtroCategoria) {
          return false;
        }

        // Active only by default
        if (p.situacao !== 'Ativo') return false;

        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [db.pessoas, db.designacoesBase, filtroBase, filtroCategoria]);

  // Compute full dossier per mechanic
  const dossiers = useMemo(() => {
    return filteredPessoas.map((p) => {
      const licencas = db.licencas.filter((l) => l.pessoa_id === p.id);
      const treinamentos = db.treinamentos.filter((t) => t.pessoa_id === p.id && !t.substituido_por);

      // Licenças ANAC
      const chtCel = licencas.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'CEL');
      const chtGmp = licencas.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'GMP');
      const chtAvi = licencas.find((l) => l.orgao === 'ANAC' && l.tipo === 'CHT' && l.habilitacao === 'AVI');

      const statusCel = chtCel ? calcularStatusLicenca(chtCel, dataReferencia, db.configuracao) : 'Sem registro';
      const statusGmp = chtGmp ? calcularStatusLicenca(chtGmp, dataReferencia, db.configuracao) : 'Sem registro';
      const statusAvi = chtAvi ? calcularStatusLicenca(chtAvi, dataReferencia, db.configuracao) : 'Sem registro';

      const statusAnacList: ItemStatus[] = [];
      if (chtCel) statusAnacList.push(statusCel);
      if (chtGmp) statusAnacList.push(statusGmp);
      if (chtAvi) statusAnacList.push(statusAvi);

      const piorAnac = piorStatus(statusAnacList);

      // Treinamentos calculados
      const trnCalculados = treinamentos.map((t) => {
        const curso = cursosMap.get(t.curso_id);
        const { status, data_vencimento, dias_para_vencer } = calcularStatusTreinamento(
          t,
          curso,
          dataReferencia,
          db.configuracao
        );

        // Engines
        const motorIds = db.treinamentosMotor
          .filter((tm) => tm.treinamento_id === t.id)
          .map((tm) => tm.motor_id);

        const motoresNomes = motorIds.map((mId) => motoresMap.get(mId) || mId);

        return {
          treinamento: t,
          curso,
          status,
          data_vencimento,
          dias_para_vencer,
          motoresNomes,
          isPendencia: status === 'Vencido' || status.startsWith('Vence ≤'),
        };
      });

      const piorTrn = piorStatus(trnCalculados.map((t) => t.status));
      const situacaoGeral = piorStatus([piorAnac, piorTrn]);

      // Filter according to variation
      const trnExibidos =
        variacao === 'pendencias'
          ? trnCalculados.filter((t) => t.isPendencia)
          : trnCalculados;

      const hasPendenciasGerais =
        statusCel === 'Vencido' ||
        statusCel.startsWith('Vence ≤') ||
        statusGmp === 'Vencido' ||
        statusGmp.startsWith('Vence ≤') ||
        trnCalculados.some((t) => t.isPendencia);

      return {
        pessoa: p,
        chtCel,
        chtGmp,
        chtAvi,
        statusCel,
        statusGmp,
        statusAvi,
        piorAnac,
        piorTrn,
        situacaoGeral,
        treinamentos: trnExibidos,
        hasPendenciasGerais,
      };
    });
  }, [filteredPessoas, db.licencas, db.treinamentos, db.treinamentosMotor, cursosMap, motoresMap, dataReferencia, db.configuracao, variacao]);

  // Further filter people if in 'pendencias' mode
  const dossiersExibidos = useMemo(() => {
    if (variacao === 'pendencias') {
      return dossiers.filter((d) => d.hasPendenciasGerais);
    }
    return dossiers;
  }, [dossiers, variacao]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Bar Controls (Hidden in Print) */}
      <div className="no-print bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Relatório do Roster de Treinamentos &amp; Habilitações</span>
            <span className="text-xs bg-sky-100 text-sky-900 font-semibold px-2 py-0.5 rounded">
              Acompanhamento Técnico
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dossiê impresso de cursos e licenças por mecânico, com filtro por base e variações selecionáveis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Base Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-4 h-4 text-sky-800" />
            <span className="font-semibold text-slate-700">Base:</span>
            <select
              value={filtroBase}
              onChange={(e) => setFiltroBase(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-hidden"
            >
              <option value="TOTAL">TOTAL (Todas as Bases)</option>
              {db.bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} - {b.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Report Variation Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-700">Modo:</span>
            <div className="inline-flex rounded border border-slate-300 bg-slate-50 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setVariacao('completo')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  variacao === 'completo' ? 'bg-sky-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                (a) Completo
              </button>
              <button
                onClick={() => setVariacao('pendencias')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  variacao === 'pendencias' ? 'bg-sky-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                (b) Pendências
              </button>
              <button
                onClick={() => setVariacao('licencas')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  variacao === 'licencas' ? 'bg-sky-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                (c) Só Licenças
              </button>
            </div>
          </div>

          {/* Print Button */}
          <button
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 text-white rounded-md text-xs font-semibold hover:bg-sky-800 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-sky-300" />
            <span>Imprimir Roster</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="print-container bg-white p-6 rounded-lg border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-6">
        {/* Report Official Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-950 text-white flex flex-col items-center justify-center font-black rounded border border-slate-900">
              <span className="text-xs leading-none">IMPACTO</span>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">
                IMPACTO AVIATION — RELATÓRIO DO ROSTER DE TREINAMENTOS E HABILITAÇÕES
              </h2>
              <div className="text-[10px] text-slate-600 flex items-center gap-2 mt-0.5">
                <span>
                  Base: <strong>{filtroBase}</strong>
                </span>
                <span>·</span>
                <span>
                  Data de Referência: <strong>{formatarDataBr(dataReferencia)}</strong>
                </span>
                <span>·</span>
                <span>
                  Modo:{' '}
                  <strong>
                    {variacao === 'completo'
                      ? 'Dossiê Completo'
                      : variacao === 'pendencias'
                      ? 'Somente Pendências (Vencidos e a Vencer)'
                      : 'Somente Licenças e Habilitações'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] font-mono text-slate-500">
            <div>Mecânicos listados: {dossiersExibidos.length}</div>
          </div>
        </div>

        {/* Mechanics List */}
        <div className="space-y-6">
          {dossiersExibidos.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhum mecânico com dados para os filtros selecionados.
            </div>
          ) : (
            dossiersExibidos.map((dossier, idx) => {
              const { pessoa, chtCel, chtGmp, chtAvi, statusCel, statusGmp, statusAvi, situacaoGeral, treinamentos } =
                dossier;

              return (
                <div
                  key={pessoa.id}
                  className="border border-slate-200 rounded-lg overflow-hidden page-break-inside-avoid print:border-slate-400"
                >
                  {/* Mechanic Summary Header Bar */}
                  <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300">
                        {pessoa.id}
                      </span>
                      <span className="font-bold text-slate-950 text-sm">{pessoa.nome}</span>
                      <span className="text-slate-500 text-[11px]">
                        Base: <strong>{pessoa.base_principal_id}</strong>
                        {pessoa.cliente_ou_area && ` (${pessoa.cliente_ou_area})`}
                      </span>
                      <span className="text-slate-500 text-[11px] font-mono">
                        CANAC: <strong>{pessoa.canac || 'N/D'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* CHT dates summary */}
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        {chtCel && (
                          <span
                            style={{
                              backgroundColor: getStatusColor(statusCel).bg,
                              color: getStatusColor(statusCel).text,
                            }}
                            className="px-1.5 py-0.5 rounded border border-black/10 font-medium"
                          >
                            CEL: {formatarDataBr(chtCel.data_vencimento)}
                          </span>
                        )}
                        {chtGmp && (
                          <span
                            style={{
                              backgroundColor: getStatusColor(statusGmp).bg,
                              color: getStatusColor(statusGmp).text,
                            }}
                            className="px-1.5 py-0.5 rounded border border-black/10 font-medium"
                          >
                            GMP: {formatarDataBr(chtGmp.data_vencimento)}
                          </span>
                        )}
                        {chtAvi && (
                          <span
                            style={{
                              backgroundColor: getStatusColor(statusAvi).bg,
                              color: getStatusColor(statusAvi).text,
                            }}
                            className="px-1.5 py-0.5 rounded border border-black/10 font-medium"
                          >
                            AVI: {formatarDataBr(chtAvi.data_vencimento)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">
                          Situação Geral:
                        </span>
                        <StatusBadge status={situacaoGeral} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Trainings Table (unless variation is 'licencas') */}
                  {variacao !== 'licencas' && (
                    <div className="p-2 overflow-x-auto">
                      {treinamentos.length === 0 ? (
                        <div className="py-2 px-3 text-[11px] text-slate-400 italic">
                          {variacao === 'pendencias'
                            ? 'Nenhum treinamento vencido ou a vencer para este mecânico.'
                            : 'Nenhum treinamento registrado.'}
                        </div>
                      ) : (
                        <table className="w-full text-[10px] border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                              <th className="py-1 px-2 text-left w-24">Grupo</th>
                              <th className="py-1 px-2 text-left w-36">Frota / Variante</th>
                              <th className="py-1 px-2 text-left">Curso</th>
                              <th className="py-1 px-2 text-center w-20">Execução</th>
                              <th className="py-1 px-2 text-center w-20">Vencimento</th>
                              <th className="py-1 px-2 text-center w-16">Dias</th>
                              <th className="py-1 px-2 text-center w-24">Status</th>
                              <th className="py-1 px-2 text-left">Motores Habilitados</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {treinamentos.map((trnItem, tIdx) => (
                              <tr key={tIdx} className="hover:bg-slate-50/70">
                                <td className="py-1 px-2 font-medium text-slate-700">
                                  {trnItem.curso?.grupo || 'Frota'}
                                </td>
                                <td className="py-1 px-2 text-slate-800 font-semibold">
                                  {trnItem.curso?.variante || trnItem.curso?.frota || '-'}
                                </td>
                                <td className="py-1 px-2 font-medium text-slate-900">
                                  {trnItem.curso?.curso || trnItem.treinamento.curso_id}
                                </td>
                                <td className="py-1 px-2 text-center font-mono text-slate-600">
                                  {formatarDataBr(trnItem.treinamento.data_execucao)}
                                </td>
                                <td className="py-1 px-2 text-center font-mono">
                                  {trnItem.data_vencimento
                                    ? formatarDataBr(trnItem.data_vencimento)
                                    : 'Sem vencimento'}
                                </td>
                                <td className="py-1 px-2 text-center font-mono tabular-nums font-semibold">
                                  {trnItem.dias_para_vencer !== null ? (
                                    <span
                                      className={
                                        trnItem.dias_para_vencer < 0
                                          ? 'text-red-700'
                                          : trnItem.dias_para_vencer <= faixas.faixa_1
                                          ? 'text-orange-700'
                                          : 'text-slate-600'
                                      }
                                    >
                                      {trnItem.dias_para_vencer}d
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="py-1 px-2 text-center">
                                  <StatusBadge status={trnItem.status} size="sm" />
                                </td>
                                <td className="py-1 px-2 text-slate-700">
                                  {trnItem.motoresNomes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trnItem.motoresNomes.map((mNome, mIdx) => (
                                        <span
                                          key={mIdx}
                                          className="text-[9px] bg-sky-50 text-sky-900 border border-sky-200 px-1 py-0.2 rounded font-mono"
                                        >
                                          {mNome}
                                        </span>
                                      ))}
                                    </div>
                                  ) : trnItem.treinamento.motor_original ? (
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      {trnItem.treinamento.motor_original}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            Impacto Aviation — Organização de Manutenção Aeronáutica
          </div>
          <div>
            Data de Emissão: {formatarDataBr(new Date().toISOString())}
          </div>
        </div>
      </div>
    </div>
  );
};
