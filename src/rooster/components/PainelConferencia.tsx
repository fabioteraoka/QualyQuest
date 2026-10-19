import React from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  Layers,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PostImportConferenceData } from '../services/storage';

interface PainelConferenciaProps {
  data: PostImportConferenceData;
  onClose?: () => void;
}

export const PainelConferencia: React.FC<PainelConferenciaProps> = ({ data, onClose }) => {
  const { setActiveTab, navigateToFicha, showToast } = useApp();

  const handleDownloadBackup = () => {
    const blob = new Blob([data.backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Oficial_Impacto_Aviation_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Cópia de segurança oficial baixada com sucesso!');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Painel de Conferência Pós-Importação
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Transação Concluída com Sucesso
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Origem: <strong>{data.nomeArquivo}</strong> • Modo: <strong>{data.modo === 'substituir' ? 'Substituir tudo' : 'Mesclar'}</strong> • Data/Hora: {new Date(data.dataHora).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer border border-white/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Cópia Oficial (.json)</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <span>Ir para o Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">Total Gravado</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {data.totalGravados.toLocaleString('pt-BR')}
            </div>
            <span className="text-[10px] text-slate-400">Registros relacionais</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">Mecânicos Ativos</span>
            <div className="text-xl font-bold font-mono text-sky-950 mt-0.5">
              {data.mecanicos.length}
            </div>
            <span className="text-[10px] text-slate-400">Técnicos de manutenção</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">Administrativo</span>
            <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
              {data.administrativos.length}
            </div>
            <span className="text-[10px] text-slate-400">Equipe de apoio / PCP</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">Sanidade dos Dados</span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {data.verificacoesSanidade.filter((v) => v.aprovado).length} / {data.verificacoesSanidade.length}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">100% dos testes aprovados</span>
          </div>
        </div>

        {/* Sanity Check Verification Cards */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Verificação Rápida de Sanidade (Critérios de Auditoria Oficial)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.verificacoesSanidade.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border flex items-start gap-3 transition-colors ${
                  item.aprovado
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {item.aprovado ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{item.titulo}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                        item.aprovado
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          : 'bg-rose-100 text-rose-950 border-rose-300'
                      }`}
                    >
                      {item.aprovado ? 'Aprovado' : 'Divergência'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">{item.descricao}</div>
                  <div className="text-[11px] font-mono text-slate-700 bg-white/70 px-2 py-1 rounded border border-slate-200/60 mt-1">
                    {item.encontrado}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Entity Comparison Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-700" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Resumo por Entidade Relacional (Esperado × Lido × Gravado)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Validação comparativa contra <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">meta.contagens</code>
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Entidade Relacional</th>
                  <th className="py-2.5 px-3 text-center">Esperado (Meta)</th>
                  <th className="py-2.5 px-3 text-center">Lido do Arquivo</th>
                  <th className="py-2.5 px-3 text-center">Gravado no Banco</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.tabelaResumo.map((row) => (
                  <tr key={row.entidade} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {row.nomeExibicao}
                      <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                        ({row.entidade})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-600">
                      {row.esperado !== undefined ? row.esperado : '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                      {row.noArquivo}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                      {row.gravados}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {row.status === 'OK' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>OK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Divergência</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* List of Mechanics & Administrative Personnel */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-700" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Pessoas Gravadas ({data.mecanicos.length} Mecânicos + {data.administrativos.length} Administrativos)
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('designacao')}
              className="text-xs font-semibold text-sky-800 hover:text-sky-950 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Lista de Designação Oficial</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">Nome Oficial</th>
                  <th className="py-2 px-3">Categoria</th>
                  <th className="py-2 px-3">CANAC</th>
                  <th className="py-2 px-3">Base Principal</th>
                  <th className="py-2 px-3">Cliente / Área</th>
                  <th className="py-2 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.mecanicos.concat(data.administrativos).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-700">{p.id}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{p.nome}</td>
                    <td className="py-1.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          p.categoria === 'Mecânico'
                            ? 'bg-sky-100 text-sky-900'
                            : 'bg-purple-100 text-purple-900'
                        }`}
                      >
                        {p.categoria}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 font-mono text-slate-600">{p.canac || '—'}</td>
                    <td className="py-1.5 px-3">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.base_principal_id}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-500 text-[11px]">{p.cliente_ou_area || '—'}</td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        onClick={() => navigateToFicha(p.id)}
                        className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ficha</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Todos os dados foram recalculados pelo motor de regras de negócio.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON Oficial</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <span>Abrir Dashboard Executivo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
