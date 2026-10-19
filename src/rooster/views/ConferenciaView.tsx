import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Filter,
  Info,
  MapPin,
  Plane,
  Printer,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import { AeronaveDesignacao, AlertaConferencia, CursoCatalogo, ItemStatus, SimNaoVazio } from '../types';
import { AERONAVE_PARA_FROTAS, conferirDesignacao, formatarDataBr } from '../utils/businessRules';

export const ConferenciaView: React.FC = () => {
  const { db, filtroBase, setFiltroBase, dataReferencia, navigateToFicha, currentUser, showToast, triggerPrint } =
    useApp();

  const [somenteAlertas, setSomenteAlertas] = useState(false);
  const [aeronaveFiltro, setAeronaveFiltro] = useState<string>('TODAS');

  const aeronavesLista: AeronaveDesignacao[] = ['B737', 'E190E2', 'A320FAM', 'A330', 'B767', 'B777'];

  const cursosMap = useMemo(() => {
    const map = new Map<string, CursoCatalogo>();
    db.cursosCatalogo.forEach((c) => map.set(c.id, c));
    return map;
  }, [db.cursosCatalogo]);

  const itemsConferencia = useMemo(() => {
    const list: Array<{
      pessoaId: string;
      pessoaNome: string;
      base: string;
      aeronave: AeronaveDesignacao;
      designado: SimNaoVazio;
      resultado: AlertaConferencia;
      isAlertaCritico: boolean;
    }> = [];

    const pessoasFiltradas = db.pessoas.filter((p) => {
      if (p.categoria !== 'Mecânico' || p.situacao !== 'Ativo') return false;
      if (filtroBase !== 'TOTAL') {
        const basesPessoa = db.designacoesBase
          .filter((b) => b.pessoa_id === p.id)
          .map((b) => b.base_id);
        const hasInDesignacao = basesPessoa.includes(filtroBase);
        const hasInPrincipal = basesPessoa.length === 0 && p.base_principal_id === filtroBase;
        if (!hasInDesignacao && !hasInPrincipal) return false;
      }
      return true;
    });

    pessoasFiltradas.forEach((p) => {
      aeronavesLista.forEach((aero) => {
        if (aeronaveFiltro !== 'TODAS' && aero !== aeronaveFiltro) return;

        const desig = db.designacoesAeronave.find((da) => da.pessoa_id === p.id && da.aeronave === aero);
        const valor = desig?.valor || '';

        const resultado = conferirDesignacao(
          p.id,
          aero,
          valor,
          db.treinamentos,
          cursosMap,
          dataReferencia,
          db.configuracao
        );

        const isAlertaCritico = valor === 'SIM' && (resultado === 'Vencido' || resultado === 'Sem registro');

        if (somenteAlertas && !isAlertaCritico && resultado !== 'Vigente s/ designação') {
          return;
        }

        list.push({
          pessoaId: p.id,
          pessoaNome: p.nome,
          base: p.base_principal_id,
          aeronave: aero,
          designado: valor,
          resultado,
          isAlertaCritico,
        });
      });
    });

    return list;
  }, [db.pessoas, db.designacoesBase, db.designacoesAeronave, db.treinamentos, cursosMap, dataReferencia, db.configuracao, filtroBase, aeronaveFiltro, somenteAlertas]);

  const totais = useMemo(() => {
    let criticos = 0;
    let ok = 0;
    let semDesigMasVigente = 0;

    itemsConferencia.forEach((item) => {
      if (item.isAlertaCritico) criticos++;
      else if (item.resultado === 'OK') ok++;
      else if (item.resultado === 'Vigente s/ designação') semDesigMasVigente++;
    });

    return { criticos, ok, semDesigMasVigente };
  }, [itemsConferencia]);

  const handleRemoverDesignacao = (pessoaId: string, aero: AeronaveDesignacao) => {
    if (confirm(`Deseja alterar a designação da aeronave ${aero} para 'NÃO'?`)) {
      repository.setDesignacaoAeronave(pessoaId, aero, 'NÃO');
      showToast(`Designação de ${aero} atualizada para NÃO.`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header and Controls */}
      <div className="no-print bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Conferência de Designação × Treinamento de Frota</span>
            <span className="text-xs bg-orange-100 text-orange-950 font-bold px-2 py-0.5 rounded border border-orange-200">
              Auditoria de Conformidade
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verifica se cada mecânico com aeronave designada com &quot;SIM&quot; possui curso de frota válido e vigente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Base Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-4 h-4 text-sky-800" />
            <span className="font-semibold text-slate-700">Base:</span>
            <select
              value={filtroBase}
              onChange={(e) => setFiltroBase(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-900"
            >
              <option value="TOTAL">TOTAL</option>
              {db.bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id}
                </option>
              ))}
            </select>
          </div>

          {/* Aircraft Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Plane className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-slate-700">Aeronave:</span>
            <select
              value={aeronaveFiltro}
              onChange={(e) => setAeronaveFiltro(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-900"
            >
              <option value="TODAS">Todas as Aeronaves</option>
              {aeronavesLista.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Somente Alertas */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded cursor-pointer hover:bg-slate-100">
            <input
              type="checkbox"
              checked={somenteAlertas}
              onChange={(e) => setSomenteAlertas(e.target.checked)}
            />
            <span>Somente Alertas / Não Conformidades</span>
          </label>

          <button
            onClick={triggerPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-lg border border-red-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-700">
              Não Conformidades Críticas
            </div>
            <div className="text-xl font-bold font-mono text-red-800 mt-0.5 tabular-nums">
              {totais.criticos}
            </div>
            <div className="text-[10px] text-red-600">Marcados SIM mas sem curso vigente</div>
          </div>
          <AlertOctagon className="w-8 h-8 text-red-500 opacity-60" />
        </div>

        <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Conformes / Em Ordem
            </div>
            <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5 tabular-nums">
              {totais.ok}
            </div>
            <div className="text-[10px] text-emerald-700">Treinamento e designação alinhados</div>
          </div>
          <ShieldCheck className="w-8 h-8 text-emerald-600 opacity-60" />
        </div>

        <div className="bg-white p-3 rounded-lg border border-sky-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
              Vigente sem Designação
            </div>
            <div className="text-xl font-bold font-mono text-sky-800 mt-0.5 tabular-nums">
              {totais.semDesigMasVigente}
            </div>
            <div className="text-[10px] text-sky-700">Possui curso mas não está marcado SIM</div>
          </div>
          <Info className="w-8 h-8 text-sky-600 opacity-60" />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Mecânico</th>
                <th className="py-2.5 px-2">Base</th>
                <th className="py-2.5 px-3 text-center">Aeronave</th>
                <th className="py-2.5 px-3 text-center">Designação</th>
                <th className="py-2.5 px-3 text-center">Frotas no Roster</th>
                <th className="py-2.5 px-3 text-center">Status de Auditoria</th>
                <th className="py-2.5 px-3 text-right no-print">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemsConferencia.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itemsConferencia.map((item, idx) => {
                  const frotasAlvo = AERONAVE_PARA_FROTAS[item.aeronave] || [];

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 transition-colors ${
                        item.isAlertaCritico ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => navigateToFicha(item.pessoaId)}
                          className="text-left hover:text-sky-900 hover:underline cursor-pointer"
                        >
                          {item.pessoaNome}
                        </button>
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-600 font-bold">{item.base}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800">
                        {item.aeronave}
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            item.designado === 'SIM'
                              ? 'bg-slate-900 text-white'
                              : item.designado === 'NÃO'
                              ? 'bg-slate-100 text-slate-500'
                              : 'text-amber-500 italic'
                          }`}
                        >
                          {item.designado || 'Não Decidido'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-[10px] text-slate-500 font-mono">
                        {frotasAlvo.join(', ')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.resultado === 'OK'
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : item.resultado === 'Vencido'
                              ? 'bg-red-100 text-red-950 border border-red-300'
                              : item.resultado === 'Sem registro' && item.designado === 'SIM'
                              ? 'bg-orange-100 text-orange-950 border border-orange-300'
                              : 'bg-sky-100 text-sky-950 border border-sky-300'
                          }`}
                        >
                          {item.resultado}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right no-print">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigateToFicha(item.pessoaId)}
                            className="text-xs text-sky-700 hover:underline font-semibold cursor-pointer"
                          >
                            Abrir Ficha
                          </button>
                          {item.isAlertaCritico && currentUser.perfil !== 'Leitor' && (
                            <button
                              onClick={() => handleRemoverDesignacao(item.pessoaId, item.aeronave)}
                              className="text-[10px] bg-red-100 text-red-900 px-2 py-0.5 rounded hover:bg-red-200 font-semibold cursor-pointer"
                              title="Marcar NÃO nesta aeronave"
                            >
                              Corrigir para NÃO
                            </button>
                          )}
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
    </div>
  );
};
