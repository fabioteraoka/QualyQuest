import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Grid, MapPin, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { CursoCatalogo, ItemStatus, MotorCatalogo, Pessoa, Treinamento } from '../types';
import { calcularStatusTreinamento, getStatusColor, piorStatus } from '../utils/businessRules';

type MatrizTab = 'frota' | 'motores' | 'doutrinacao';

export const MatrizesView: React.FC = () => {
  const { db, filtroBase, setFiltroBase, filtroCategoria, dataReferencia, faixas, triggerPrint } = useApp();

  const [activeTab, setActiveTab] = useState<MatrizTab>('frota');

  const cursosMap = useMemo(() => {
    const map = new Map<string, CursoCatalogo>();
    db.cursosCatalogo.forEach((c) => map.set(c.id, c));
    return map;
  }, [db.cursosCatalogo]);

  const pessoas = useMemo(() => {
    return db.pessoas
      .filter((p) => {
        if (p.situacao !== 'Ativo') return false;
        if (filtroCategoria !== 'Todos' && p.categoria !== filtroCategoria) return false;
        if (filtroBase !== 'TOTAL') {
          const basesPessoa = db.designacoesBase.filter((b) => b.pessoa_id === p.id).map((b) => b.base_id);
          const hasInDesignacao = basesPessoa.includes(filtroBase);
          const hasInPrincipal = basesPessoa.length === 0 && p.base_principal_id === filtroBase;
          if (!hasInDesignacao && !hasInPrincipal) return false;
        }
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [db.pessoas, db.designacoesBase, filtroBase, filtroCategoria]);

  // 12 Fleet Variants
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

  // 8 Indoctrination Courses
  const doutrinacaoCursos = [
    'AVSEC',
    'PISOA',
    'Integração e Seg Operacional',
    'Direção Defensiva',
    'PPSP',
    'MOMQ',
    'SGSO',
    'Human Factors',
  ];

  // Engine Manufacturers and Selected Key Models
  const fabricantesMotores = ['GE', 'CFM', 'IAE', 'PW', 'RR'];

  // Matrix 1: Frota
  const matrizFrota = useMemo(() => {
    return pessoas.map((p) => {
      const pTreinamentos = db.treinamentos.filter((t) => t.pessoa_id === p.id && !t.substituido_por);

      const celulas = variantesLista.map((variante) => {
        const trnsDaVariante = pTreinamentos.filter((t) => {
          const c = cursosMap.get(t.curso_id);
          return c && c.variante === variante;
        });

        if (trnsDaVariante.length === 0) {
          return null; // Empty
        }

        const statusList = trnsDaVariante.map((t) => {
          const c = cursosMap.get(t.curso_id);
          const { status } = calcularStatusTreinamento(t, c, dataReferencia, db.configuracao);
          return status;
        });

        return piorStatus(statusList);
      });

      return { pessoa: p, celulas };
    });
  }, [pessoas, db.treinamentos, cursosMap, dataReferencia, db.configuracao]);

  // Matrix 2: Motores (Fabricante)
  const matrizMotores = useMemo(() => {
    return pessoas.map((p) => {
      const pTreinamentos = db.treinamentos.filter((t) => t.pessoa_id === p.id && !t.substituido_por);
      const celulas = fabricantesMotores.map((fab) => {
        // Find if person has any training associated with this manufacturer
        const motoresDoFab = db.motoresCatalogo.filter((m) => m.fabricante === fab);
        const motorIdsDoFab = new Set(motoresDoFab.map((m) => m.id));

        const trnsComFab = pTreinamentos.filter((t) => {
          const linkedMotorIds = db.treinamentosMotor
            .filter((tm) => tm.treinamento_id === t.id)
            .map((tm) => tm.motor_id);

          return linkedMotorIds.some((mId) => motorIdsDoFab.has(mId));
        });

        if (trnsComFab.length === 0) return null;

        const hasVigente = trnsComFab.some((t) => {
          const c = cursosMap.get(t.curso_id);
          const { status } = calcularStatusTreinamento(t, c, dataReferencia, db.configuracao);
          return status !== 'Vencido' && status !== 'Sem registro';
        });

        return hasVigente ? ('Vigente' as const) : ('Vencido' as const);
      });

      return { pessoa: p, celulas };
    });
  }, [pessoas, db.treinamentos, db.motoresCatalogo, db.treinamentosMotor, cursosMap, dataReferencia, db.configuracao]);

  // Matrix 3: Doutrinação
  const matrizDoutrinacao = useMemo(() => {
    return pessoas.map((p) => {
      const pTreinamentos = db.treinamentos.filter((t) => t.pessoa_id === p.id && !t.substituido_por);

      const celulas = doutrinacaoCursos.map((cursoNome) => {
        const trn = pTreinamentos.find((t) => {
          const c = cursosMap.get(t.curso_id);
          return c && c.grupo === 'Doutrinação' && c.curso === cursoNome;
        });

        if (!trn) return null;

        const c = cursosMap.get(trn.curso_id);
        const { status } = calcularStatusTreinamento(trn, c, dataReferencia, db.configuracao);
        return status;
      });

      return { pessoa: p, celulas };
    });
  }, [pessoas, db.treinamentos, cursosMap, dataReferencia, db.configuracao]);

  // Export current matrix to Excel
  const handleExportMatrix = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'frota') {
      const data = matrizFrota.map((row) => {
        const obj: any = { Mecânico: row.pessoa.nome, Base: row.pessoa.base_principal_id };
        variantesLista.forEach((v, idx) => {
          obj[v] = row.celulas[idx] || '';
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Matriz_Frota');
    } else if (activeTab === 'motores') {
      const data = matrizMotores.map((row) => {
        const obj: any = { Mecânico: row.pessoa.nome, Base: row.pessoa.base_principal_id };
        fabricantesMotores.forEach((fab, idx) => {
          obj[fab] = row.celulas[idx] || '';
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Matriz_Motores');
    } else {
      const data = matrizDoutrinacao.map((row) => {
        const obj: any = { Mecânico: row.pessoa.nome, Base: row.pessoa.base_principal_id };
        doutrinacaoCursos.forEach((c, idx) => {
          obj[c] = row.celulas[idx] || '';
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Matriz_Doutrinacao');
    }

    XLSX.writeFile(wb, `Matriz_${activeTab}_Impacto.xlsx`);
  };

  return (
    <div className="p-6 max-w-[1550px] mx-auto space-y-4">
      {/* Header and Controls */}
      <div className="no-print bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Matrizes de Qualificação (Mapas de Calor)</span>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
              Base: {filtroBase}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão bidimensional de mecânicos × aeronaves, motorizações e treinamentos de doutrinação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Matriz Tabs */}
          <div className="inline-flex rounded border border-slate-300 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('frota')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                activeTab === 'frota' ? 'bg-sky-900 text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              1. Frotas (12 Variantes)
            </button>
            <button
              onClick={() => setActiveTab('motores')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                activeTab === 'motores' ? 'bg-sky-900 text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              2. Motores (Fabricantes)
            </button>
            <button
              onClick={() => setActiveTab('doutrinacao')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                activeTab === 'doutrinacao' ? 'bg-sky-900 text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              3. Doutrinação (8 Cursos)
            </button>
          </div>

          <button
            onClick={handleExportMatrix}
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
            <span>Imprimir Matriz</span>
          </button>
        </div>
      </div>

      {/* Matrix Table Container */}
      <div className="print-container bg-white p-6 rounded-lg border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          {/* TAB 1: FROTA */}
          {activeTab === 'frota' && (
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <th className="border border-slate-300 py-2 px-2 text-left min-w-[170px] sticky left-0 bg-slate-100 z-10">
                    Mecânico ({pessoas.length})
                  </th>
                  <th className="border border-slate-300 py-2 px-1 text-center w-12">Base</th>
                  {variantesLista.map((v) => (
                    <th key={v} className="border border-slate-300 py-2 px-1 text-center min-w-[75px] max-w-[85px] leading-tight">
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrizFrota.map((row) => (
                  <tr key={row.pessoa.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 py-1.5 px-2 font-semibold text-slate-900 whitespace-nowrap sticky left-0 bg-white">
                      {row.pessoa.nome}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-1 text-center font-mono font-bold text-slate-700">
                      {row.pessoa.base_principal_id}
                    </td>
                    {row.celulas.map((status, idx) => {
                      if (!status) {
                        return (
                          <td key={idx} className="border border-slate-300 py-1 px-1 text-center text-slate-200">
                            -
                          </td>
                        );
                      }
                      const colors = getStatusColor(status);
                      return (
                        <td
                          key={idx}
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                          className="border border-slate-300 py-1 px-1 text-center font-bold text-[9px] whitespace-nowrap"
                        >
                          {status}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: MOTORES */}
          {activeTab === 'motores' && (
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <th className="border border-slate-300 py-2.5 px-3 text-left min-w-[200px] sticky left-0 bg-slate-100 z-10">
                    Mecânico ({pessoas.length})
                  </th>
                  <th className="border border-slate-300 py-2.5 px-2 text-center w-14">Base</th>
                  {fabricantesMotores.map((fab) => (
                    <th key={fab} className="border border-slate-300 py-2.5 px-2 text-center min-w-[100px]">
                      {fab}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrizMotores.map((row) => (
                  <tr key={row.pessoa.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 py-2 px-3 font-semibold text-slate-900 whitespace-nowrap sticky left-0 bg-white">
                      {row.pessoa.nome}
                    </td>
                    <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold text-slate-700">
                      {row.pessoa.base_principal_id}
                    </td>
                    {row.celulas.map((res, idx) => {
                      if (!res) {
                        return (
                          <td key={idx} className="border border-slate-300 py-2 px-2 text-center text-slate-300">
                            -
                          </td>
                        );
                      }
                      const isVig = res === 'Vigente';
                      return (
                        <td
                          key={idx}
                          className={`border border-slate-300 py-2 px-2 text-center font-bold text-xs ${
                            isVig
                              ? 'bg-emerald-100 text-emerald-950 font-black'
                              : 'bg-red-100 text-red-950 font-black'
                          }`}
                        >
                          {res}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 3: DOUTRINAÇÃO */}
          {activeTab === 'doutrinacao' && (
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <th className="border border-slate-300 py-2 px-2 text-left min-w-[170px] sticky left-0 bg-slate-100 z-10">
                    Mecânico ({pessoas.length})
                  </th>
                  <th className="border border-slate-300 py-2 px-1 text-center w-12">Base</th>
                  {doutrinacaoCursos.map((cNome) => (
                    <th key={cNome} className="border border-slate-300 py-2 px-1 text-center min-w-[85px] leading-tight">
                      {cNome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrizDoutrinacao.map((row) => (
                  <tr key={row.pessoa.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 py-1.5 px-2 font-semibold text-slate-900 whitespace-nowrap sticky left-0 bg-white">
                      {row.pessoa.nome}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-1 text-center font-mono font-bold text-slate-700">
                      {row.pessoa.base_principal_id}
                    </td>
                    {row.celulas.map((status, idx) => {
                      if (!status) {
                        return (
                          <td key={idx} className="border border-slate-300 py-1 px-1 text-center text-slate-300">
                            Sem registro
                          </td>
                        );
                      }
                      const colors = getStatusColor(status);
                      return (
                        <td
                          key={idx}
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                          className="border border-slate-300 py-1 px-1 text-center font-bold text-[9px] whitespace-nowrap"
                        >
                          {status}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
