import React, { useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldAlert, 
  TrendingUp, 
  ArrowRight, 
  Sparkles, 
  Plus, 
  Printer, 
  UploadCloud,
  Building2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Check,
  Presentation,
  Cpu,
  Compass
} from 'lucide-react';
import { NCRecord, AlertaItem } from '../types';
import { formatarData, calcularDiasRestantes } from '../utils/qualityHelpers';
import { exportToExcel } from '../utils/exportHelpers';
import { RiskMatrixWidget } from './RiskMatrixWidget';
import { PageHeader, SectionHeader, Card, StatCard, Badge, Button } from '../design-system/components';
import { DS } from '../design-system/tokens';

interface DashboardViewProps {
  records: NCRecord[];
  manualsCount?: number;
  alertas: AlertaItem[];
  onSelectNC: (nc: NCRecord) => void;
  onViewOfficial: (nc: NCRecord) => void;
  onNewNC: () => void;
  onOpenExtractor: () => void;
  onOpenReportTab: (statusFilter?: string) => void;
  onOpenAlertsTab: () => void;
  onOpenManualsTab?: () => void;
  onOpenPresentationTab?: () => void;
  onOpenArchitectureTab?: () => void;
  onOpenTourTab?: () => void;
  onAuditNC?: (nc: NCRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records = [],
  manualsCount = 5,
  alertas = [],
  onSelectNC,
  onViewOfficial,
  onNewNC,
  onOpenExtractor,
  onOpenReportTab,
  onOpenAlertsTab,
  onOpenManualsTab,
  onOpenPresentationTab,
  onOpenArchitectureTab,
  onOpenTourTab,
  onAuditNC,
}) => {
  const safeRecords = records || [];
  const safeAlertas = alertas || [];
  const total = safeRecords.length;
  const abertas = safeRecords.filter((r) => r.statusGeral !== 'Encerrada').length;
  const encerradas = safeRecords.filter((r) => r.statusGeral === 'Encerrada').length;
  const taxaEficacia = total > 0 ? Math.round((encerradas / total) * 100) : 0;

  const vencidas = safeAlertas.filter((a) => a.tipoAlerta === 'VENCIDA');
  const vencendoHoje = safeAlertas.filter((a) => a.tipoAlerta === 'VENCE_HOJE');
  const vencendo7d = safeAlertas.filter((a) => a.tipoAlerta === 'VENCE_7_DIAS');
  const totalCriticos = vencidas.length + vencendoHoje.length;

  // Department / Sector Incidences
  const departmentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    safeRecords.forEach((r) => {
      const s = r.setor || 'Outros';
      counts[s] = (counts[s] || 0) + 1;
    });

    const totalCount = safeRecords.length || 1;
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / totalCount) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, 4);
  }, [records]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Actions */}
      <PageHeader
        title="Painel de Controle da Qualidade"
        subtitle="Monitoramento executivo de Não Conformidades, prazos regulatórios e conformidade documental SGQ."
        badge="SGQ Compliance"
        badgeVariant="info"
        actions={
          <>
            {onOpenTourTab && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenTourTab}
                icon={<Compass className="w-3.5 h-3.5 text-emerald-600" />}
              >
                Conheça o QualiGest
              </Button>
            )}
            {onOpenPresentationTab && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenPresentationTab}
                icon={<Presentation className="w-3.5 h-3.5 text-blue-600" />}
              >
                Apresentação SGQ
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcel(records, 'sgq_base_geral')}
              icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Exportar Base (.xlsx)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenExtractor}
              icon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Extração IA
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onNewNC}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Nova NC
            </Button>
          </>
        }
      />

      {/* 2. KPIs Corporativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="NCs Totais"
          value={total}
          subtext="Total registrado no ciclo ativo"
          icon={<FileText className="w-4 h-4" />}
          onClick={() => onOpenReportTab()}
        />

        <StatCard
          label="NCs em Aberto"
          value={abertas}
          subtext={`${encerradas} já concluídas e validadas`}
          icon={<Clock className="w-4 h-4" />}
          variant={abertas > 0 ? 'info' : 'default'}
          onClick={() => onOpenReportTab('Aberta')}
        />

        <StatCard
          label="Prazos Vencidos"
          value={vencidas.length}
          subtext={vencidas.length > 0 ? 'Ação de contenção imediata necessária' : 'Sem atrasos regulatórios'}
          icon={<ShieldAlert className="w-4 h-4" />}
          variant={vencidas.length > 0 ? 'critical' : 'default'}
          onClick={onOpenAlertsTab}
        />

        <StatCard
          label="Índice de Eficácia"
          value={`${taxaEficacia}%`}
          subtext={`${encerradas} de ${total} NCs com eficácia comprovada`}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
          onClick={() => onOpenReportTab('Encerrada')}
        />
      </div>

      {/* 3. Alertas Triados (Ação Imediata, Atenção, Acompanhamento) */}
      {(vencidas.length > 0 || vencendoHoje.length > 0 || vencendo7d.length > 0) && (
        <Card padding="none" className="overflow-hidden border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-800">Alertas de Prazos e Monitoramento SGQ</h3>
            </div>
            <button
              onClick={onOpenAlertsTab}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Ver todos ({alertas.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Bloco 1: Ação Imediata */}
            <div className={`p-3 rounded-[8px] border ${vencidas.length > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Ação Imediata</span>
                <Badge variant="critical" size="sm">{vencidas.length} Vencida(s)</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {vencidas.length > 0
                  ? 'Existem Não Conformidades com prazo expirado necessitando intervenção e contenção imediata.'
                  : 'Nenhuma Não Conformidade com prazo estourado.'}
              </p>
            </div>

            {/* Bloco 2: Atenção */}
            <div className={`p-3 rounded-[8px] border ${vencendo7d.length > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Atenção (7 Dias)</span>
                <Badge variant="warning" size="sm">{vencendo7d.length + vencendoHoje.length} Próximas</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Acompanhar envio de causas raízes e planos de ação antes do vencimento do prazo regulatório.
              </p>
            </div>

            {/* Bloco 3: Acompanhamento */}
            <div className="p-3 rounded-[8px] border bg-slate-50 border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Acompanhamento</span>
                <Badge variant="neutral" size="sm">{total - abertas} Concluídas</Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Verificação de eficácia e encerramento documental conforme cronograma de auditoria.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Grid Principal: Matriz de Risco & Incidências por Setor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Matriz de Risco 5x5 (col-span-7) */}
        <div className="lg:col-span-7">
          <RiskMatrixWidget records={records} />
        </div>

        {/* Incidência por Departamento (col-span-5) */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col justify-between" padding="lg">
            <div>
              <SectionHeader
                title="Incidências por Setor"
                subtitle="Concentração de Não Conformidades por área de operação"
                icon={<Building2 className="w-4 h-4 text-slate-600" />}
              />

              <div className="space-y-3.5 mt-4">
                {departmentStats.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>{item.name}</span>
                      <span className="font-semibold text-slate-900">
                        {item.count} NCs ({item.percent}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-800 rounded-full transition-all duration-300"
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Auditorias MOMQ / RBAC 145 ativas</span>
              <button
                onClick={() => onOpenReportTab()}
                className="font-semibold text-slate-800 hover:text-blue-700"
              >
                Detalhar por área →
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* 5. Tabela de Registros Recentes */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className={DS.typography.sectionTitle}>Não Conformidades Recentes</h3>
            <p className={DS.typography.sectionSubtitle}>
              Últimos registros cadastrados com acompanhamento de risco e prazos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenReportTab()}
            >
              Ver Todas ({records.length})
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Código / NC</th>
                <th className="py-3 px-4">Descrição & Ocorrência</th>
                <th className="py-3 px-4">Setor</th>
                <th className="py-3 px-4">Risco</th>
                <th className="py-3 px-4">Prazo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeRecords.slice(0, 6).map((nc) => {
                const dias = calcularDiasRestantes(nc.prazoResposta);
                const isOverdue = dias < 0 && nc.statusGeral !== 'Encerrada';

                return (
                  <tr key={nc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                      #{nc.numeroNC}
                    </td>
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="font-semibold text-slate-900 truncate">{nc.titulo}</div>
                      <div className="text-slate-500 truncate text-[11px]">{nc.descricaoNC}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{nc.setor}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="risk" value={nc.avaliacaoRiscoInicial.nivel} size="sm">
                        {nc.avaliacaoRiscoInicial.codigo}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                        {formatarData(nc.prazoResposta)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {isOverdue ? '(VENCIDO)' : `${dias}d restantes`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="status" value={nc.statusGeral} size="sm">
                        {nc.statusGeral}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onAuditNC && (
                          <button
                            onClick={() => onAuditNC(nc)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-[6px] transition-colors"
                            title="Auditar com IA contra Manuais"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onViewOfficial(nc)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-[6px] transition-colors"
                          title="Visualizar Ficha F 001-29"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
