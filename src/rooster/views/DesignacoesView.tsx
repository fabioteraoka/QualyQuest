import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit2,
  FileCheck2,
  Filter,
  MapPin,
  Plane,
  Save,
  Search,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import { AeronaveDesignacao, FuncaoDesignacao, SimNaoVazio } from '../types';

export const DesignacoesView: React.FC = () => {
  const { db, currentUser, showToast, navigateToFicha } = useApp();

  const [busca, setBusca] = useState('');
  const [baseFiltro, setBaseFiltro] = useState('TODAS');

  const funcoesLista: FuncaoDesignacao[] = ['Executante', 'Supervisor', 'IIO', 'Inspetor', 'APRS'];
  const aeronavesLista: AeronaveDesignacao[] = ['B737', 'E190E2', 'A320FAM', 'A330', 'B767', 'B777'];

  const mecanicos = useMemo(() => {
    return db.pessoas
      .filter((p) => {
        if (p.categoria !== 'Mecânico') return false;

        if (baseFiltro !== 'TODAS') {
          const basesPessoa = db.designacoesBase.filter((b) => b.pessoa_id === p.id).map((b) => b.base_id);
          const hasInDesignacao = basesPessoa.includes(baseFiltro);
          const hasInPrincipal = basesPessoa.length === 0 && p.base_principal_id === baseFiltro;
          if (!hasInDesignacao && !hasInPrincipal) return false;
        }

        if (busca.trim()) {
          const q = busca.toLowerCase();
          return p.nome.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        }

        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [db.pessoas, db.designacoesBase, baseFiltro, busca]);

  const toggleFuncao = async (pessoaId: string, funcao: FuncaoDesignacao, atual: SimNaoVazio) => {
    if (currentUser.perfil === 'Leitor') return;
    const proximo: SimNaoVazio = atual === 'SIM' ? 'NÃO' : atual === 'NÃO' ? '' : 'SIM';
    try {
      await repository.setDesignacaoFuncao(pessoaId, funcao, proximo, currentUser.nome);
    } catch (err: any) {
      showToast(`Erro ao atualizar designação: ${err?.message || err}`);
    }
  };

  const toggleAeronave = async (pessoaId: string, aeronave: AeronaveDesignacao, atual: SimNaoVazio) => {
    if (currentUser.perfil === 'Leitor') return;
    const proximo: SimNaoVazio = atual === 'SIM' ? 'NÃO' : atual === 'NÃO' ? '' : 'SIM';
    try {
      await repository.setDesignacaoAeronave(pessoaId, aeronave, proximo, currentUser.nome);
    } catch (err: any) {
      showToast(`Erro ao atualizar aeronave designada: ${err?.message || err}`);
    }
  };

  const handleToggleBase = async (pessoaId: string, baseId: string, currentBases: string[]) => {
    if (currentUser.perfil === 'Leitor') return;
    let newBases: string[];
    if (currentBases.includes(baseId)) {
      newBases = currentBases.filter((b) => b !== baseId);
    } else {
      newBases = [...currentBases, baseId];
    }
    try {
      await repository.setDesignacaoBasesForPessoa(pessoaId, newBases, currentUser.nome);
    } catch (err: any) {
      showToast(`Erro ao atualizar bases designadas: ${err?.message || err}`);
    }
  };

  return (
    <div className="p-6 max-w-[1550px] mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Tabelas de Designação &amp; Autorizações Técnicas</span>
            <span className="text-xs bg-pink-100 text-pink-900 font-semibold px-2 py-0.5 rounded border border-pink-200">
              Decisão da Organização
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configuração das bases autorizadas, funções exercidas e frotas designadas para cada mecânico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar mecânico..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white w-48"
            />
          </div>

          <select
            value={baseFiltro}
            onChange={(e) => setBaseFiltro(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
          >
            <option value="TODAS">Todas as Bases</option>
            {db.bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Matrix */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <th rowSpan={2} className="py-2 px-3 border-r border-slate-200 min-w-[190px]">
                  Mecânico
                </th>
                <th rowSpan={2} className="py-2 px-2 text-center border-r border-slate-200 w-24">
                  Bases Designadas
                </th>
                <th rowSpan={2} className="py-2 px-2 text-center border-r border-slate-200 w-16">
                  IMP
                </th>
                <th rowSpan={2} className="py-2 px-2 text-center border-r border-slate-200 w-16">
                  EASA Type
                </th>
                <th
                  colSpan={5}
                  style={{ backgroundColor: '#FF99FF' }}
                  className="py-1.5 px-2 text-center text-slate-950 font-black border-r border-slate-300 text-[11px]"
                >
                  FUNÇÕES DESIGNADAS
                </th>
                <th
                  colSpan={6}
                  style={{ backgroundColor: '#FF99FF' }}
                  className="py-1.5 px-2 text-center text-slate-950 font-black text-[11px]"
                >
                  AERONAVES DESIGNADAS
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-700 font-semibold text-[10px] border-b border-slate-200">
                {/* Funções */}
                {funcoesLista.map((f) => (
                  <th key={f} className="py-1.5 px-2 text-center border-r border-slate-200 bg-[#EDEDED]">
                    {f}
                  </th>
                ))}
                {/* Aeronaves */}
                {aeronavesLista.map((a) => (
                  <th key={a} className="py-1.5 px-2 text-center border-r border-slate-200">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mecanicos.map((p) => {
                const desig = db.designacoesPessoa.find((dp) => dp.pessoa_id === p.id);
                const basesPessoa = db.designacoesBase
                  .filter((b) => b.pessoa_id === p.id)
                  .map((b) => b.base_id);

                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap border-r border-slate-100">
                      <button
                        onClick={() => navigateToFicha(p.id)}
                        className="hover:underline hover:text-sky-900 cursor-pointer font-bold"
                      >
                        {p.nome}
                      </button>
                    </td>

                    {/* Bases Selector Chips */}
                    <td className="py-1 px-1.5 border-r border-slate-100 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {db.bases.map((base) => {
                          const isAssigned = basesPessoa.includes(base.id);
                          return (
                            <button
                              key={base.id}
                              onClick={() => handleToggleBase(p.id, base.id, basesPessoa)}
                              disabled={currentUser.perfil === 'Leitor'}
                              className={`px-1 py-0.5 text-[9px] font-mono font-bold rounded cursor-pointer transition-colors ${
                                isAssigned
                                  ? 'bg-sky-900 text-white'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title={`Alternar base ${base.id}`}
                            >
                              {base.id}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-2 px-2 text-center font-mono text-[11px] font-bold text-slate-700 border-r border-slate-100">
                      {desig?.imp || '-'}
                    </td>

                    <td className="py-2 px-2 text-center font-bold text-[11px] text-slate-800 border-r border-slate-100">
                      {desig?.easa_type || 'N/A'}
                    </td>

                    {/* Funções SIM / NÃO */}
                    {funcoesLista.map((f) => {
                      const val =
                        db.designacoesFuncao.find((df) => df.pessoa_id === p.id && df.funcao === f)?.valor || '';
                      return (
                        <td
                          key={f}
                          onClick={() => toggleFuncao(p.id, f, val)}
                          className={`py-1.5 px-2 text-center font-bold text-[11px] border-r border-slate-100 cursor-pointer select-none transition-colors ${
                            val === 'SIM'
                              ? 'bg-emerald-50 text-emerald-950 font-black hover:bg-emerald-100'
                              : val === 'NÃO'
                              ? 'bg-[#EDEDED] text-slate-400 hover:bg-slate-200'
                              : 'bg-white text-transparent hover:bg-slate-100'
                          }`}
                          title="Clique para alternar (SIM / NÃO / Vazio)"
                        >
                          {val || '-'}
                        </td>
                      );
                    })}

                    {/* Aeronaves SIM / NÃO (Highlight empty in yellow) */}
                    {aeronavesLista.map((a) => {
                      const val =
                        db.designacoesAeronave.find((da) => da.pessoa_id === p.id && da.aeronave === a)?.valor || '';
                      const isVazio = !val;

                      return (
                        <td
                          key={a}
                          onClick={() => toggleAeronave(p.id, a, val)}
                          className={`py-1.5 px-2 text-center font-bold text-[11px] border-r border-slate-100 cursor-pointer select-none transition-colors ${
                            val === 'SIM'
                              ? 'bg-sky-50 text-sky-950 font-black hover:bg-sky-100'
                              : val === 'NÃO'
                              ? 'bg-slate-50 text-slate-400 hover:bg-slate-200'
                              : 'bg-amber-100/70 text-amber-900 hover:bg-amber-200'
                          }`}
                          title={isVazio ? 'Ainda não decidido (Pendente)' : 'Clique para alternar'}
                        >
                          {val || '?'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
