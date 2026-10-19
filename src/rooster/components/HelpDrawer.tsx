import React from 'react';
import { BookOpen, ExternalLink, HelpCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HelpTopic {
  title: string;
  category: string;
  manualSectionId: string;
  content: string[];
  tips?: string[];
}

const HELP_TOPICS: Record<string, HelpTopic> = {
  dashboard: {
    title: 'Dashboard & Indicadores Operacionais',
    category: 'Operação',
    manualSectionId: 'dashboard',
    content: [
      'Visão geral da prontidão técnica de toda a frota e pessoal da Impacto Aviation.',
      'Os cartões superiores exibem o semáforo de vencimento calculado dinamicamente em relação à Data de Referência.',
      'Clique nos cartões de status ou nas linhas da tabela para filtrar instantaneamente os mecânicos e cursos afetados.',
      'Ajuste o filtro de Base (ex.: REC, GRU ou TOTAL) no topo para isolar uma base operacional.',
    ],
    tips: [
      'Pressione a tecla "/" para buscar mecânicos rapidamente.',
      'A Data de Referência padrão para auditorias é 15/10/2026.',
    ],
  },
  designacao: {
    title: 'Lista de Designação Oficial (A4 Paisagem)',
    category: 'Documentos Oficiais',
    manualSectionId: 'lista-designacao',
    content: [
      'Documento regulamentar homologado contendo os mecânicos autorizados para intervenções técnicas e liberação de voo (RII, Run-Up, NDT, etc.).',
      'Exibe o cabeçalho oficial da Impacto Aviation e campos de assinatura do Responsável Técnico (Alysson Rabelo).',
      'Use o seletor "Destacar Vencimentos" para alternar entre modo de auditoria colorida e impressão formal monocromática.',
    ],
    tips: [
      'Imprima sempre em papel A4 orientação Paisagem.',
      'Nas opções da impressora, desmarque cabeçalhos e rodapés do navegador e use "Ajustar à Página".',
    ],
  },
  roster: {
    title: 'Relatório do Roster por Base',
    category: 'Relatórios',
    manualSectionId: 'roster-treinamentos',
    content: [
      'Relatório analítico dos cursos executados por cada mecânico com datas e validades.',
      'Disponível nos modos: Completo (todos os cursos), Somente Pendências (vencidos e a vencer) e Somente Licenças.',
    ],
  },
  conferencia: {
    title: 'Conferência de Frota & Designações',
    category: 'Qualidade & Auditoria',
    manualSectionId: 'designacoes-conferencia',
    content: [
      'Cruza as designações operacionais (Aeronaves ATR, A320, B737, E190, etc.) com a vigência dos treinamentos de frota.',
      'Linhas em amarelo destacam pendências de preenchimento (SIM/NÃO).',
      'Identifica divergências críticas: mecânicos designados com curso vencido ou cursos válidos sem designação formal.',
    ],
  },
  pessoas: {
    title: 'Gestão de Mecânicos & Colaboradores',
    category: 'Cadastros',
    manualSectionId: 'mecanicos-licencas',
    content: [
      'Cadastro individual com código CANAC, base de lotação, categoria técnica e situação (Ativo/Inativo).',
      'Possui histórico auditado e recurso "Desfazer Exclusão" caso um registro seja removido por engano.',
    ],
  },
  ficha: {
    title: 'Ficha 360° do Mecânico',
    category: 'Cadastros',
    manualSectionId: 'mecanicos-licencas',
    content: [
      'Visualização consolidada de um mecânico específico contendo:',
      '1. Licenças ANAC (CHT/CEL/GMP/AVI) e habilitação estrangeira FAA A&P.',
      '2. Treinamentos realizados, prazos e histórico de reciclagens.',
      '3. Motores aeronáuticos homologados para intervenção em linha.',
      '4. Designações ativas para funções técnicas e frotas.',
    ],
  },
  licencas: {
    title: 'Licenças e Habilitações Técnicas',
    category: 'Cadastros',
    manualSectionId: 'mecanicos-licencas',
    content: [
      'Cadastro de CHT ANAC com validades individuais por especialidade (Célula, Grupo Moto-Propulsor, Aviônicos).',
      'Registro de habilitações internacionais FAA A&P e EASA Part-66.',
    ],
  },
  treinamentos: {
    title: 'Lançamento e Renovação de Treinamentos',
    category: 'Treinamentos',
    manualSectionId: 'roster-treinamentos',
    content: [
      'Lançamento individual ou em lote por turma/curso.',
      'Ao renovar um curso, o registro anterior recebe o ponteiro "substituido_por", preservando o histórico para auditoria sem duplicidade.',
    ],
  },
  motores: {
    title: 'Motores Habilitados',
    category: 'Cadastros',
    manualSectionId: 'mecanicos-licencas',
    content: [
      'Controle de mecânicos habilitados por família de motores: CFM56-5B, CFM56-7B, V2500, LEAP-1A, LEAP-1B, PW1100G, GE90.',
    ],
  },
  matrizes: {
    title: 'Matrizes de Treinamento (Mapas de Calor)',
    category: 'Análise',
    manualSectionId: 'matrizes-vencimentos',
    content: [
      'Matriz cruzada Pessoas × Cursos com codificação visual por cores de vencimento.',
      'Ideal para identificar lacunas de qualificação por base antes da escala de voos.',
    ],
  },
  vencimentos: {
    title: 'Próximos Vencimentos',
    category: 'Planejamento',
    manualSectionId: 'matrizes-vencimentos',
    content: [
      'Filtro cronológico dos cursos que vencerão nos próximos 30, 60 ou 90 dias.',
      'Permite programar turmas de reciclagem com antecedência.',
    ],
  },
  importar: {
    title: 'Importação e Exportação (.json / .xlsx)',
    category: 'Dados & Backup',
    manualSectionId: 'importar-exportar',
    content: [
      'Permite exportar e importar a base completa via JSON oficial ou planilha Excel multi-abas.',
      'Execução em transação tudo-ou-nada com painel de conferência pós-importação.',
    ],
  },
  configuracoes: {
    title: 'Configurações, Nuvem e Acesso',
    category: 'Administração',
    manualSectionId: 'seguranca-acesso',
    content: [
      'Ajuste das faixas de alerta (padrão: 30 / 60 / 90 dias).',
      'Troca do código de acesso compartilhado e identificação de usuário.',
      'Migração de dados locais para o Firestore na nuvem.',
    ],
  },
  auditoria: {
    title: 'Auditoria & Rastreabilidade de Alterações',
    category: 'Conformidade',
    manualSectionId: 'seguranca-acesso',
    content: [
      'Registro imutável de todas as ações de inserção, alteração e exclusão realizadas.',
      'Exibe data, hora, usuário responsável, tabela e diff dos dados anteriores e novos.',
    ],
  },
};

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  topicKey?: string;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose, topicKey = 'dashboard' }) => {
  const { setActiveTab } = useApp();

  if (!isOpen) return null;

  const topic = HELP_TOPICS[topicKey] || HELP_TOPICS.dashboard;

  const handleOpenFullManual = () => {
    setActiveTab('manual');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300 block">
                  Ajuda Contextual • {topic.category}
                </span>
                <h3 className="text-sm font-bold truncate max-w-[260px]">{topic.title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-2.5">
              {topic.content.map((p, idx) => (
                <p key={idx} className="text-slate-700">
                  {p}
                </p>
              ))}
            </div>

            {topic.tips && topic.tips.length > 0 && (
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5 mt-4">
                <span className="font-bold text-sky-950 block text-[11px]">Dicas Rápidas:</span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-sky-900">
                  {topic.tips.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={handleOpenFullManual}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-sky-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Abrir Manual Completo (15 Capítulos)</span>
              <ExternalLink className="w-3 h-3 text-sky-300 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
