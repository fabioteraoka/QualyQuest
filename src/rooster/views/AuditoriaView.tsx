import React, { useState } from 'react';
import { Clock, History, Search, Shield, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatarDataBr } from '../utils/businessRules';

export const AuditoriaView: React.FC = () => {
  const { db } = useApp();
  const [busca, setBusca] = useState('');

  const auditoriaFiltrada = db.auditoria.filter((item) => {
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return (
        item.detalhes.toLowerCase().includes(q) ||
        item.usuario_nome.toLowerCase().includes(q) ||
        item.tabela.toLowerCase().includes(q) ||
        item.registro_id.toLowerCase().includes(q) ||
        item.acao.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Histórico de Alterações &amp; Trilha de Auditoria</span>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
              {auditoriaFiltrada.length} eventos
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico e imutável de todas as criações, edições, renovações e importações no sistema.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por usuário, ação, tabela..."
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white w-64"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Data e Hora</th>
                <th className="py-2.5 px-3">Usuário</th>
                <th className="py-2.5 px-2 text-center">Ação</th>
                <th className="py-2.5 px-2">Tabela</th>
                <th className="py-2.5 px-2">Registro ID</th>
                <th className="py-2.5 px-4">Detalhes da Modificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditoriaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-sans italic">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                auditoriaFiltrada.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-800 whitespace-nowrap">
                      {item.usuario_nome}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          item.acao === 'CRIAR'
                            ? 'bg-emerald-100 text-emerald-900'
                            : item.acao === 'EDITAR'
                            ? 'bg-sky-100 text-sky-900'
                            : item.acao === 'RENOVAR'
                            ? 'bg-purple-100 text-purple-900'
                            : item.acao === 'IMPORTAR'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {item.acao}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-600 font-bold">{item.tabela}</td>
                    <td className="py-2 px-2 text-slate-500">{item.registro_id}</td>
                    <td className="py-2 px-4 font-sans text-slate-800">{item.detalhes}</td>
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
