import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Building2,
  FileText,
  BookOpen,
  Users
} from 'lucide-react';
import { OrganizationRecord, OrganizationChecklistConfig } from '../types';
import { updateOrganization } from '../services/firebase/firestore';

interface InitialSetupChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationRecord | null;
  onNavigateToTab?: (tabId: string) => void;
  onUpdateOrganization?: (updatedOrg: OrganizationRecord) => void;
}

interface ChecklistItemDefinition {
  key: keyof OrganizationChecklistConfig;
  title: string;
  description: string;
  targetTab?: string;
  icon: React.ReactNode;
}

export const InitialSetupChecklistModal: React.FC<InitialSetupChecklistModalProps> = ({
  isOpen,
  onClose,
  organization,
  onNavigateToTab,
  onUpdateOrganization,
}) => {
  if (!isOpen) return null;

  const currentChecklist: OrganizationChecklistConfig = organization?.configuration?.checklistConfiguracao || {
    organizacaoConfigurada: true,
    identidadeVisualConfigurada: false,
    setoresCadastrados: false,
    usuariosCadastrados: false,
    responsaveisDefinidos: false,
    parametrosRevisados: false,
    primeiroManualInserido: false,
    primeiroRNCCadastrado: false,
    equipeOrientada: false,
  };

  const [checklist, setChecklist] = useState<OrganizationChecklistConfig>(currentChecklist);
  const [isUpdating, setIsUpdating] = useState(false);

  const checklistItems: ChecklistItemDefinition[] = [
    {
      key: 'organizacaoConfigurada',
      title: 'Organização Configurada',
      description: 'Razão social, fuso horário, idioma e identificador do tenant definidos.',
      targetTab: 'configuracoes-org',
      icon: <Building2 className="w-4 h-4 text-blue-600" />,
    },
    {
      key: 'identidadeVisualConfigurada',
      title: 'Identidade Visual Configurada',
      description: 'Sigla aeronáutica, cor primária institucional e logotipo ajustados.',
      targetTab: 'configuracoes-org',
      icon: <Sparkles className="w-4 h-4 text-purple-600" />,
    },
    {
      key: 'setoresCadastrados',
      title: 'Setores Operacionais Cadastrados',
      description: 'Oficinas, hangares, engenharia e áreas da base adicionados.',
      targetTab: 'configuracoes-org',
      icon: <CheckSquare className="w-4 h-4 text-emerald-600" />,
    },
    {
      key: 'usuariosCadastrados',
      title: 'Usuários e Papéis RBAC Cadastrados',
      description: 'Auditores, Inspetores, Gestores SGQ e Diretoria provisionados.',
      targetTab: 'seguranca',
      icon: <Users className="w-4 h-4 text-indigo-600" />,
    },
    {
      key: 'responsaveisDefinidos',
      title: 'Responsáveis Técnicos Definidos',
      description: 'Nome e cargo do gestor da garantia da qualidade homologados.',
      targetTab: 'configuracoes-org',
      icon: <ShieldCheck className="w-4 h-4 text-amber-600" />,
    },
    {
      key: 'parametrosRevisados',
      title: 'Parâmetros e SLAs Revisados',
      description: 'SLAs de resolução por criticidade (P1, P2, P3, P4) alinhados às metas.',
      targetTab: 'configuracoes-org',
      icon: <CheckSquare className="w-4 h-4 text-teal-600" />,
    },
    {
      key: 'primeiroManualInserido',
      title: 'Primeiro Manual Inserido no Repositório',
      description: 'MGM, MOE, SGSO ou procedimento padrão indexado no repositório.',
      targetTab: 'manuais',
      icon: <BookOpen className="w-4 h-4 text-sky-600" />,
    },
    {
      key: 'primeiroRNCCadastrado',
      title: 'Primeiro RNC Registrado',
      description: 'Abertura de Não Conformidade experimental ou real com cálculo de criticidade 5×5.',
      targetTab: 'formulario',
      icon: <FileText className="w-4 h-4 text-rose-600" />,
    },
    {
      key: 'equipeOrientada',
      title: 'Equipe Orientada e Capacitada',
      description: 'Equipe de qualidade instruída sobre a segregação N5 e uso das recomendações de IA.',
      targetTab: 'conheca-qualigest',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
    },
  ];

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const toggleItem = async (key: keyof OrganizationChecklistConfig) => {
    if (!organization?.id) return;
    const updated = {
      ...checklist,
      [key]: !checklist[key],
    };
    setChecklist(updated);

    try {
      setIsUpdating(true);
      await updateOrganization(organization.id, {
        configuration: {
          ...(organization.configuration || {}),
          checklistConfiguracao: updated,
        },
      });

      if (onUpdateOrganization) {
        onUpdateOrganization({
          ...organization,
          configuration: {
            ...(organization.configuration || {}),
            checklistConfiguracao: updated,
          },
        });
      }
    } catch (err) {
      console.error('Error updating checklist:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-[16px] border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono">
                PRONTIDÃO OPERACIONAL
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {organization?.name || 'Organização Ativa'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Checklist de Ativação do Novo Cliente
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhe as 9 etapas essenciais para colocar o SGQ em regime definitivo de operação.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Progresso de Prontidão</span>
              <span className="font-mono text-blue-700">{completedCount} de {totalCount} concluídos ({progressPercent}%)</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          {progressPercent === 100 && (
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>100% Homologado</span>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {checklistItems.map((item) => {
            const isCompleted = checklist[item.key];
            return (
              <div
                key={item.key}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isCompleted 
                    ? 'bg-slate-50/70 border-slate-200 text-slate-700' 
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-2xs'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.key)}
                  className="flex items-start gap-3 text-left flex-1 cursor-pointer"
                >
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </button>

                {item.targetTab && onNavigateToTab && !isCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToTab(item.targetTab!);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    <span>Configurar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Alterações salvas automaticamente no banco Firestore.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            Fechar Checklist
          </button>
        </div>
      </div>
    </div>
  );
};
