import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Cloud,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  Sparkles,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TourStep {
  title: string;
  badge: string;
  targetTab?: string;
  icon: React.ElementType;
  description: string;
  details: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Código de Acesso & Identificação Simples',
    badge: 'Acesso & Segurança',
    icon: KeyRound,
    description:
      'O sistema utiliza um código de acesso compartilhado entre a equipe técnica e armazena seu nome para rastreabilidade de auditoria.',
    details: [
      'Sem senhas individuais ou cadastros complexos: simplicidade operacional.',
      'O hash criptográfico SHA-256 é armazenado no Firestore e o dispositivo fica autorizado por 30 dias.',
      'Suas alterações ficam marcadas com seu nome na coleção de Auditoria.',
    ],
  },
  {
    title: '2. Importação dos Dados Oficiais',
    badge: 'Carga de Dados',
    targetTab: 'importar',
    icon: Upload,
    description:
      'O aplicativo inicia limpo. Você carrega os dados oficiais através de arquivo JSON ou planilha Excel multi-abas.',
    details: [
      'Validação em transação tudo-ou-nada: não salva dados corrompidos.',
      'Painel de conferência pós-importação com verificações de sanidade da auditoria.',
      'Suporte a lotes rápidos no Firestore com idempotência por ID.',
    ],
  },
  {
    title: '3. Dashboard & Semáforo de Vencimentos',
    badge: 'Operação Diária',
    targetTab: 'dashboard',
    icon: LayoutDashboard,
    description:
      'Monitore em tempo real os prazos de cursos e habilitações com base na Data de Referência configurada.',
    details: [
      'Semáforo visual: Vencido (Vermelho), ≤30d (Laranja), ≤60d (Amarelo) e ≤90d (Amarelo Claro).',
      'Filtro instantâneo por Base (TOTAL ou bases locais: REC, GRU, VCP, SDU, BSB).',
      'Resumo por frota/variante (ATR, A320, B737, etc.) para liberação de voo segura.',
    ],
  },
  {
    title: '4. Ficha 360° do Mecânico',
    badge: 'Gestão Técnica',
    targetTab: 'ficha',
    icon: UserCheck,
    description:
      'Acesse a visão completa de qualquer colaborador em um único painel integrado.',
    details: [
      'Licenças ANAC (CHT/CEL/GMP/AVI) e habilitação internacional FAA A&P.',
      'Treinamentos executados, datas de vigência e histórico de renovações.',
      'Motores aeronáuticos e funções técnicas habilitadas.',
    ],
  },
  {
    title: '5. Lista de Designação Oficial (Formulário A4 Paisagem)',
    badge: 'Homologação',
    targetTab: 'designacao',
    icon: FileCheck2,
    description:
      'Gere e imprima o documento regulamentar assinado pelo Responsável Técnico da Impacto Aviation.',
    details: [
      'Cabeçalho institucional oficial e formato A4 paisagem de 1 página.',
      'Opção "Destacar Vencimentos" para inspeções técnicas da autoridade aeronáutica.',
      'Carimbo e assinatura oficial do RT (Alysson Rabelo).',
    ],
  },
  {
    title: '6. Backup, Nuvem Firebase & Modo Offline',
    badge: 'Proteção & Nuvem',
    targetTab: 'configuracoes',
    icon: Cloud,
    description:
      'Seus dados sincronizados em tempo real entre todos os computadores da empresa, com funcionamento offline garantido.',
    details: [
      'Firestore sem chaves secretas no código: fala direto com a nuvem pelo navegador.',
      'Cache offline integrado: o app continua funcionando se a internet do hangar oscilar.',
      'Exportação com 1 clique para JSON ou Excel e migração local → nuvem em Configurações.',
    ],
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const { setActiveTab } = useApp();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      const nextTarget = TOUR_STEPS[nextIdx].targetTab;
      if (nextTarget) {
        setActiveTab(nextTarget as any);
      }
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      const prevTarget = TOUR_STEPS[prevIdx].targetTab;
      if (prevTarget) {
        setActiveTab(prevTarget as any);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-950 via-sky-900 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Fechar tour"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 text-sky-300 rounded-full text-[10px] font-bold border border-sky-400/30 uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" />
            <span>Tour de Primeiro Uso • Passo {currentStepIndex + 1} de {TOUR_STEPS.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <StepIcon className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">{currentStep.title}</h2>
              <span className="text-xs text-sky-200/80">{currentStep.badge}</span>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {currentStep.description}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="text-[11px] font-bold text-slate-900 block">Destaques deste recurso:</span>
            <ul className="space-y-1.5">
              {currentStep.details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  const t = TOUR_STEPS[idx].targetTab;
                  if (t) setActiveTab(t as any);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-sky-900'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Ir para passo ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 cursor-pointer"
          >
            Pular Tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <span>{isLast ? 'Concluir Tour' : 'Próximo'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
