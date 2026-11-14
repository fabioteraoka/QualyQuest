import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  Search,
  RefreshCw,
  FileText,
  Camera,
  Lock,
  Plus,
  Archive,
  History,
  Check,
  X,
  ArrowRight,
  Layers
} from 'lucide-react';
import {
  AuditoriaExternaRecord,
  PreparacaoRequisitoAuditoria,
  UserProfile,
  ModalidadeComprovacaoEsperada
} from '../../types';
import {
  ClassificacaoCorrespondenciaBase,
  ItemPreAuditoriaComparado,
  PreAuditoriaConsolidada,
  PreAuditoriaSnapshot,
  RequisitoAuditoriaExterna
} from '../../types/auditRequirements';
import {
  analisarAuditoriaContraBaseInstitucional,
  gerarSnapshotImutavelPreAuditoria,
  recalcularResumoPreAuditoria
} from '../../services/preAuditMatchingService';
import {
  ContextoCruzadoSGQ,
  incorporarRequisitoNaBaseInstitucional,
  sugerirRespostaBaseadaEmFontes
} from '../../services/auditReadinessService';

interface PreAuditWorkspaceViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  audits: AuditoriaExternaRecord[];
  auditRequirements: RequisitoAuditoriaExterna[];
  preparacoesBase: PreparacaoRequisitoAuditoria[];
  preAudits: PreAuditoriaConsolidada[];
  contextoSGQ: ContextoCruzadoSGQ;
  selectedAuditIdInicial?: string;
  onSavePreAudit: (preAudit: PreAuditoriaConsolidada) => Promise<void>;
  onUpdateBasePreparacao?: (prep: PreparacaoRequisitoAuditoria) => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenImportMode?: () => void;
}

const CLASSIF_CONFIG: Record<
  ClassificacaoCorrespondenciaBase,
  { label: string; badge: string; border: string; icon: any; desc: string }
> = {
  'EQUIVALÊNCIA CONFIRMADA': {
    label: 'EQUIVALÊNCIA CONFIRMADA',
    badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-700',
    border: 'border-emerald-800/60',
    icon: CheckCircle2,
    desc: 'Requisito equivalente na Base Institucional, resposta APROVADA, escopo compatível e evidências vigentes.'
  },
  'EQUIVALÊNCIA PARCIAL': {
    label: 'EQUIVALÊNCIA PARCIAL',
    badge: 'bg-amber-950/90 text-amber-300 border-amber-700',
    border: 'border-amber-800/60',
    icon: AlertTriangle,
    desc: 'Correspondência encontrada, mas exige adaptação de escopo, atualização de revisão ou evidência específica.'
  },
  'REQUISITO SEM RESPOSTA APROVADA': {
    label: 'REQUISITO SEM RESPOSTA APROVADA',
    badge: 'bg-indigo-950/90 text-indigo-300 border-indigo-700',
    border: 'border-indigo-800/60',
    icon: Clock,
    desc: 'Requisito existe na Base Institucional, porém ainda sem resposta aprovada pela Qualidade.'
  },
  'NOVO REQUISITO': {
    label: 'NOVO REQUISITO',
    badge: 'bg-rose-950/90 text-rose-300 border-rose-700',
    border: 'border-rose-800/60',
    icon: HelpCircle,
    desc: 'Requisito sem equivalência na Base Institucional (177+). Requer tratamento específico e eventual incorporação.'
  }
};

export const PreAuditWorkspaceView: React.FC<PreAuditWorkspaceViewProps> = ({
  organizationId,
  userProfile,
  audits,
  auditRequirements,
  preparacoesBase,
  preAudits,
  contextoSGQ,
  selectedAuditIdInicial,
  onSavePreAudit,
  onUpdateBasePreparacao,
  onNavigateToTab,
  onOpenImportMode
}) => {
  const isConsulta = userProfile?.role === 'CONSULTA' || userProfile?.role === 'VIEWER';
  const isQualityLeadership = ['ADMIN', 'ADMINISTRADOR', 'GESTOR_SGQ', 'GESTOR'].includes(
    (userProfile?.role || '').toUpperCase()
  );

  // Auditorias elegíveis (preferencialmente as que têm requisitos vinculados ou registradas)
  const sortedAudits = useMemo(() => {
    return [...audits].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [audits]);

  const [selectedAuditId, setSelectedAuditId] = useState<string>(() => {
    if (selectedAuditIdInicial) return selectedAuditIdInicial;
    if (preAudits.length > 0) return preAudits[0].auditId;
    return sortedAudits[0]?.id || '';
  });

  const activeAudit = useMemo(
    () => sortedAudits.find((a) => a.id === selectedAuditId) || sortedAudits[0] || null,
    [sortedAudits, selectedAuditId]
  );

  const activePreAudit = useMemo(() => {
    if (!activeAudit) return null;
    return preAudits.find((pa) => pa.auditId === activeAudit.id) || null;
  }, [preAudits, activeAudit]);

  const activeAuditRequirements = useMemo(() => {
    if (!activeAudit) return [];
    return auditRequirements.filter(
      (r) => r.auditId === activeAudit.id && r.statusRegistro !== 'CANCELADO'
    );
  }, [auditRequirements, activeAudit]);

  // Filtros e estados de edição
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [adaptacaoTexto, setAdaptacaoTexto] = useState('');
  const [adaptacaoObs, setAdaptacaoObs] = useState('');
  const [incorporatingItem, setIncorporatingItem] = useState<ItemPreAuditoriaComparado | null>(null);
  const [incorpResposta, setIncorpResposta] = useState('');
  const [incorpNorma, setIncorpNorma] = useState('');
  const [incorpModalidade, setIncorpModalidade] = useState<ModalidadeComprovacaoEsperada>('COMBINACAO_DE_EVIDENCIAS');
  const [incorpAprovarDireto, setIncorpAprovarDireto] = useState(true);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<PreAuditoriaSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const filteredItems = useMemo(() => {
    if (!activePreAudit) return [];
    return activePreAudit.itens.filter((it) => {
      if (filtroClassificacao !== 'TODAS' && it.classificacao !== filtroClassificacao) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          it.numeroItem.toLowerCase().includes(term) ||
          it.textoOriginalRequisito.toLowerCase().includes(term) ||
          (it.capituloOuSecao || '').toLowerCase().includes(term) ||
          (it.requisitoBaseCodigo || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [activePreAudit, filtroClassificacao, searchTerm]);

  // Gerar ou Reexecutar análise contra a Base Institucional viva
  const handleRunComparison = async () => {
    if (!activeAudit) return;
    if (activeAuditRequirements.length === 0) {
      setFeedback({
        tipo: 'erro',
        msg: 'Esta auditoria ainda não possui requisitos individualizados importados. Importe o checklist no Smart Import Real.'
      });
      return;
    }

    setSaving(true);
    try {
      const consolidada = analisarAuditoriaContraBaseInstitucional({
        organizationId,
        audit: activeAudit,
        requisitosAuditados: activeAuditRequirements,
        preparacoesBase,
        contextoSGQ,
        existingPreAudit: activePreAudit,
        currentUser: userProfile
      });
      await onSavePreAudit(consolidada);
      setFeedback({
        tipo: 'sucesso',
        msg: `Pré-auditoria analisada contra ${preparacoesBase.length} requisitos da Base Institucional: ${consolidada.resumo.equivalenciaConfirmada} confirmados, ${consolidada.resumo.equivalenciaParcial} parciais, ${consolidada.resumo.semRespostaAprovada} sem resposta aprovada e ${consolidada.resumo.novoRequisito} novos.`
      });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Falha ao gerar pré-auditoria.' });
    } finally {
      setSaving(false);
    }
  };

  // Salvar adaptação específica da auditoria (NUNCA altera a resposta base aprovada)
  const handleSaveAdaptation = async (item: ItemPreAuditoriaComparado, validarParaAuditoria: boolean) => {
    if (!activePreAudit || isConsulta) return;
    setSaving(true);
    try {
      const updatedItens = activePreAudit.itens.map((it) => {
        if (it.id !== item.id) return it;
        return {
          ...it,
          respostaAdaptadaAuditoria: adaptacaoTexto,
          observacoesEscopo: adaptacaoObs,
          statusTratamento: validarParaAuditoria ? ('VALIDADO_PARA_AUDITORIA' as const) : it.statusTratamento,
          validadoPorNome: validarParaAuditoria ? userProfile?.displayName || 'Qualidade SGQ' : it.validadoPorNome,
          validadoEm: validarParaAuditoria ? new Date().toISOString().split('T')[0] : it.validadoEm
        };
      });

      const resumo = recalcularResumoPreAuditoria(updatedItens);
      await onSavePreAudit({
        ...activePreAudit,
        itens: updatedItens,
        resumo,
        updatedAt: new Date().toISOString()
      });

      setEditingItemId(null);
      setFeedback({
        tipo: 'sucesso',
        msg: `Adaptação específica para a auditoria ${activePreAudit.numeroAuditoria} salva sem alterar a resposta institucional base.`
      });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao salvar adaptação.' });
    } finally {
      setSaving(false);
    }
  };

  // Abrir painel de incorporação de NOVO REQUISITO na Base Institucional
  const handleOpenIncorporate = (item: ItemPreAuditoriaComparado) => {
    const sugestao = sugerirRespostaBaseadaEmFontes(
      {
        id: item.requisitoAuditoriaId,
        numeroItem: item.numeroItem,
        perguntaOuCriterio: item.textoOriginalRequisito,
        referenciaNormativa: item.referenciaNormativa || activePreAudit?.codigoChecklist || '',
        moduloOuSecao: item.capituloOuSecao
      } as any,
      null,
      contextoSGQ.documentosControlados || [],
      contextoSGQ.evidenciasDisponiveis || [],
      contextoSGQ
    );

    setIncorporatingItem(item);
    setIncorpResposta(item.respostaAdaptadaAuditoria || sugestao.respostaSugerida);
    setIncorpNorma(item.referenciaNormativa || activePreAudit?.codigoChecklist || 'Norma do Cliente');
    setIncorpModalidade('COMBINACAO_DE_EVIDENCIAS');
    setIncorpAprovarDireto(isQualityLeadership);
  };

  // Confirmar incorporação permanente na Base Institucional (Requer aprovação Qualidade)
  const handleConfirmIncorporate = async () => {
    if (!incorporatingItem || !activePreAudit) return;
    if (!incorpResposta.trim() || incorpResposta.trim().length < 20) {
      setFeedback({ tipo: 'erro', msg: 'Informe uma resposta institucional fundamentada (mínimo 20 caracteres).' });
      return;
    }

    setSaving(true);
    try {
      const agora = new Date().toISOString();
      const hoje = agora.split('T')[0];
      const novoPrepId = `PREP-INC-${Date.now()}-${incorporatingItem.numeroItem.replace(/[^a-zA-Z0-9]/g, '')}`;

      const novaPrep: PreparacaoRequisitoAuditoria = {
        id: novoPrepId,
        organizationId,
        requisitoId: `INC-${activePreAudit.numeroAuditoria}-${incorporatingItem.numeroItem}`,
        numeroItem: incorporatingItem.numeroItem,
        tituloRequisito: incorporatingItem.textoOriginalRequisito.slice(0, 120),
        textoOriginal: incorporatingItem.textoOriginalRequisito, // Texto original preservado integralmente
        autoridadeOuCliente: activePreAudit.clienteOuEntidade,
        normaDocumento: incorpNorma,
        secaoReferencia: incorporatingItem.capituloOuSecao,
        revisaoFonte: activePreAudit.revisaoChecklist || 'Vigente',
        controleCentralId: 'CTRL-DOCS-01',
        controleCentralCodigo: 'CTRL-DOCS-01',
        controleCentralNome: 'Gestão Integrada de Requisitos Corporativos',
        aplicabilidade: 'APLICAVEL',
        conformidadeSGQ: incorpAprovarDireto ? 'CONFORME' : 'AGUARDANDO_EVIDENCIA',
        modalidadeComprovacao: incorpModalidade,
        justificativaModalidade: 'Definida durante incorporação controlada pós-auditoria.',
        respostaTexto: incorpResposta,
        origemResposta: 'TRATAMENTO_MANUAL',
        statusResposta: incorpAprovarDireto ? 'APROVADA' : 'AGUARDANDO_VALIDACAO',
        versaoResposta: '1.0',
        respostaRevisada: incorpAprovarDireto,
        fontesUtilizadas: incorporatingItem.documentosRelacionados.map((d) => ({
          tipo: 'PROCEDIMENTO',
          nome: `${d.codigo} — ${d.titulo}`,
          referencia: d.codigo,
          revisao: d.revisao || 'Vigente'
        })),
        historicoRespostas: [
          {
            versao: '1.0',
            dataHora: agora,
            usuarioNome: userProfile?.displayName || 'Qualidade SGQ',
            acao: incorpAprovarDireto ? 'APROVACAO' : 'CRIACAO',
            textoNovo: incorpResposta,
            motivo: `Incorporação na Base Institucional a partir da auditoria ${activePreAudit.numeroAuditoria} (${activePreAudit.clienteOuEntidade}).`
          }
        ],
        documentosRelacionados: incorporatingItem.documentosRelacionados.map((d) => ({
          documentoId: d.codigo,
          codigo: d.codigo,
          titulo: d.titulo,
          revisao: d.revisao || 'Vigente',
          situacao: d.situacao || 'VIGENTE',
          adicionadoPorNome: userProfile?.displayName || 'Qualidade SGQ',
          adicionadoEm: hoje
        })),
        evidenciasVinculadas: [],
        evidenciasSuficientes: incorpModalidade === 'DOCUMENTAL_PURO',
        pendencias: [],
        situacaoProntidao: incorpAprovarDireto && incorpModalidade === 'DOCUMENTAL_PURO' ? 'PRONTO_PARA_AUDITORIA' : 'EM_PREPARACAO',
        origemBase: 'INCORPORADO_POS_AUDITORIA',
        auditoriaIncorporacaoId: activePreAudit.auditId,
        auditoriaIncorporacaoNumero: activePreAudit.numeroAuditoria,
        clienteIncorporacao: activePreAudit.clienteOuEntidade,
        incorporadoEm: agora,
        incorporadoPorNome: userProfile?.displayName || 'Qualidade SGQ',
        createdAt: agora,
        updatedAt: agora
      };

      const savedBase = await incorporarRequisitoNaBaseInstitucional(
        organizationId,
        novaPrep,
        userProfile,
        preparacoesBase
      );

      if (onUpdateBasePreparacao) {
        onUpdateBasePreparacao(savedBase);
      }

      // Atualizar o item da pré-auditoria vinculando ao novo registro institucional
      const updatedItens = activePreAudit.itens.map((it) => {
        if (it.id !== incorporatingItem.id) return it;
        return {
          ...it,
          statusTratamento: 'INCORPORADO_NA_BASE' as const,
          incorporadoNaBaseId: savedBase.id,
          incorporadoEm: agora,
          requisitoBaseId: savedBase.id,
          requisitoBaseCodigo: savedBase.requisitoId,
          origemBaseMatch: 'INCORPORADO_POS_AUDITORIA' as const,
          respostaInstitucionalBase: savedBase.respostaTexto,
          respostaAdaptadaAuditoria: savedBase.respostaTexto
        };
      });

      await onSavePreAudit({
        ...activePreAudit,
        itens: updatedItens,
        resumo: recalcularResumoPreAuditoria(updatedItens),
        baseInstitucionalTotalNoMomento: preparacoesBase.length + 1,
        updatedAt: agora
      });

      setIncorporatingItem(null);
      setFeedback({
        tipo: 'sucesso',
        msg: `Requisito [${savedBase.requisitoId}] aprovado e incorporado permanentemente à Base Institucional (${preparacoesBase.length + 1} requisitos).`
      });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao incorporar requisito na Base Institucional.' });
    } finally {
      setSaving(false);
    }
  };

  // Emitir Snapshot Imutável
  const handleCreateSnapshot = async () => {
    if (!activePreAudit || isConsulta) return;
    setSaving(true);
    try {
      const updated = gerarSnapshotImutavelPreAuditoria(
        activePreAudit,
        userProfile,
        `Snapshot formal emitido em ${new Date().toLocaleDateString('pt-BR')} para auditoria ${activePreAudit.numeroAuditoria}.`
      );
      await onSavePreAudit(updated);
      setFeedback({
        tipo: 'sucesso',
        msg: `Snapshot imutável v${updated.snapshots.length} emitido e congelado com sucesso.`
      });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao gerar snapshot imutável.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho da Pré-Auditoria */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                Pré-Auditoria vs. Base Institucional ({preparacoesBase.length} Requisitos)
              </span>
              {activePreAudit?.snapshots && activePreAudit.snapshots.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedSnapshot(activePreAudit.snapshots[activePreAudit.snapshots.length - 1]);
                    setShowSnapshotsModal(true);
                  }}
                  className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1 hover:bg-purple-900 cursor-pointer"
                >
                  <History className="w-3 h-3" />
                  <span>{activePreAudit.snapshots.length} Snapshot(s) Imutável(is)</span>
                </button>
              )}
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Consolidação de Pré-Auditoria & Reutilização da Base Institucional
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Analisa cada requisito recebido da auditoria externa contra a Base Institucional da IMPACTO. Respostas aprovadas são exibidas como referência somente leitura; adaptações locais preservam a integridade da base permanente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('preparacao-auditorias')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Abrir Base 177+ Requisitos</span>
              </button>
            )}
            {onOpenImportMode && (
              <button
                onClick={onOpenImportMode}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Importar Novo Checklist</span>
              </button>
            )}
          </div>
        </div>

        {/* Seletor de Auditoria & Ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <label className="text-xs font-semibold text-slate-400">Auditoria Alvo:</label>
            <select
              value={activeAudit?.id || ''}
              onChange={(e) => setSelectedAuditId(e.target.value)}
              className="flex-1 max-w-md px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold"
            >
              {sortedAudits.map((aud) => (
                <option key={aud.id} value={aud.id}>
                  {aud.numeroAuditoria} — {aud.entidadeAuditora} ({aud.checklistCodigo || aud.referenciaExterna || aud.escopo})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400">
              {activeAuditRequirements.length} requisitos importados
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunComparison}
              disabled={saving || !activeAudit || isConsulta}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
              <span>{activePreAudit ? 'Reanalisar vs. Base Viva' : 'Gerar Pré-Auditoria Comparativa'}</span>
            </button>

            {activePreAudit && !isConsulta && (
              <button
                onClick={handleCreateSnapshot}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Emitir Snapshot Imutável</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Estado vazio se ainda não gerada pré-auditoria */}
      {!activePreAudit ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-sky-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            {activeAuditRequirements.length > 0
              ? `Auditoria "${activeAudit?.numeroAuditoria}" pronta para comparação com a Base Institucional`
              : 'Nenhum checklist de auditoria selecionado com requisitos importados'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            {activeAuditRequirements.length > 0
              ? `Clique em "Gerar Pré-Auditoria Comparativa" para comparar os ${activeAuditRequirements.length} requisitos importados com os ${preparacoesBase.length} requisitos da Base Institucional e classificar automaticamente cada item.`
              : 'Importe um novo checklist em "Smart Import Real" para gerar automaticamente a pré-auditoria comparativa.'}
          </p>
        </div>
      ) : (
        <>
          {/* Cards das 4 Classificações Obrigatórias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                ['EQUIVALÊNCIA CONFIRMADA', activePreAudit.resumo.equivalenciaConfirmada],
                ['EQUIVALÊNCIA PARCIAL', activePreAudit.resumo.equivalenciaParcial],
                ['REQUISITO SEM RESPOSTA APROVADA', activePreAudit.resumo.semRespostaAprovada],
                ['NOVO REQUISITO', activePreAudit.resumo.novoRequisito]
              ] as Array<[ClassificacaoCorrespondenciaBase, number]>
            ).map(([cls, count]) => {
              const cfg = CLASSIF_CONFIG[cls];
              const Icon = cfg.icon;
              const active = filtroClassificacao === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setFiltroClassificacao(active ? 'TODAS' : cls)}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    active ? 'bg-slate-800 border-sky-500 ring-1 ring-sky-500' : `bg-slate-900 ${cfg.border} hover:bg-slate-800/70`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <Icon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-2">{count}</div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{cfg.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Barra de Busca */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar item, texto original do requisito, seção ou código base..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span>
                Exibindo <strong className="text-white">{filteredItems.length}</strong> de{' '}
                <strong className="text-white">{activePreAudit.itens.length}</strong> itens
              </span>
              {filtroClassificacao !== 'TODAS' && (
                <button
                  onClick={() => setFiltroClassificacao('TODAS')}
                  className="text-sky-400 hover:underline cursor-pointer"
                >
                  Mostrar todas as classificações
                </button>
              )}
            </div>
          </div>

          {/* Lista Comparativa de Requisitos */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const cfg = CLASSIF_CONFIG[item.classificacao];
              const ClsIcon = cfg.icon;
              const isEditing = editingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-slate-900 border ${cfg.border} rounded-2xl p-4 space-y-3`}
                >
                  {/* Linha Superior: Item, Classificação e Match */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                        Item {item.numeroItem}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">{item.capituloOuSecao}</span>
                      {item.referenciaNormativa && (
                        <span className="text-[11px] font-mono text-slate-400">({item.referenciaNormativa})</span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded border ${cfg.badge}`}>
                        <ClsIcon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                      </span>
                      {item.requisitoBaseCodigo && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          Base: {item.requisitoBaseCodigo} ({item.scoreSemantico}%)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.incorporadoNaBaseId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                          Incorporado à Base Permanente
                        </span>
                      )}
                      {item.statusTratamento === 'VALIDADO_PARA_AUDITORIA' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                          Validado p/ Auditoria
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Texto Original (Ipsis Litteris — Bloqueado) */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
                      <span>Redação Original do Requisito Recebido (Preservada Sem Alterações)</span>
                      <Lock className="w-3 h-3 text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-200 italic leading-relaxed">"{item.textoOriginalRequisito}"</p>
                  </div>

                  {/* Justificativa + Divergências de Escopo + Lacunas */}
                  <div className="text-xs text-slate-300 space-y-1.5">
                    <p>{item.justificativaClassificacao}</p>

                    {item.fatoresDivergenciaEscopo && item.fatoresDivergenciaEscopo.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[11px] space-y-0.5">
                        <strong className="block">Diferenças de Escopo / Ressalvas de Reutilização:</strong>
                        <ul className="list-disc list-inside">
                          {item.fatoresDivergenciaEscopo.map((f, idx) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.lacunasIdentificadas.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-200 text-[11px] space-y-0.5">
                        <strong className="block">Lacunas Identificadas (Complementação Obrigatória):</strong>
                        <ul className="list-disc list-inside">
                          {item.lacunasIdentificadas.map((l, idx) => (
                            <li key={idx}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Separação Estrita: Base Institucional (Somente Leitura) vs. Adaptação da Auditoria */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          Resposta Institucional Base (Somente Leitura)
                        </span>
                        {item.statusRespostaBaseNoMomento && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.statusRespostaBaseNoMomento}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {item.respostaInstitucionalBase ||
                          'Nenhuma resposta institucional aprovada vinculada na base para este item.'}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-400">
                        <span>Docs: <strong>{item.documentosRelacionados.length}</strong></span>
                        <span>•</span>
                        <span>Evidências válidas: <strong>{item.evidenciasValidas.length}</strong></span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-300">
                          Adaptação / Resposta Específica para {activePreAudit.numeroAuditoria}
                        </span>
                        {!isConsulta && !isEditing && (
                          <button
                            onClick={() => {
                              setEditingItemId(item.id);
                              setAdaptacaoTexto(
                                item.respostaAdaptadaAuditoria || item.respostaInstitucionalBase || ''
                              );
                              setAdaptacaoObs(item.observacoesEscopo || '');
                            }}
                            className="text-[11px] font-bold text-sky-400 hover:underline cursor-pointer"
                          >
                            Adaptar p/ Esta Auditoria
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={adaptacaoTexto}
                            onChange={(e) => setAdaptacaoTexto(e.target.value)}
                            rows={4}
                            placeholder="Redija a resposta contextualizada para o escopo desta auditoria (sem alterar a Base Institucional)..."
                            className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={adaptacaoObs}
                            onChange={(e) => setAdaptacaoObs(e.target.value)}
                            placeholder="Observações de escopo (aeronave, cliente, estação, evidência local)..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveAdaptation(item, false)}
                              disabled={saving}
                              className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold cursor-pointer"
                            >
                              Salvar Rascunho Local
                            </button>
                            <button
                              onClick={() => handleSaveAdaptation(item, true)}
                              disabled={saving}
                              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Validar p/ Auditoria
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {item.respostaAdaptadaAuditoria ||
                              'Ainda sem adaptação específica registrada para esta auditoria.'}
                          </p>
                          {item.observacoesEscopo && (
                            <p className="text-[10px] text-amber-300 italic">Obs. escopo: {item.observacoesEscopo}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ações Contextuais do Requisito */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    {item.classificacao === 'REQUISITO SEM RESPOSTA APROVADA' && onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('preparacao-auditorias')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-700/60 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Tratar Requisito na Base 177+</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {item.classificacao === 'NOVO REQUISITO' && !item.incorporadoNaBaseId && !isConsulta && (
                      <button
                        onClick={() => handleOpenIncorporate(item)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tratar & Incorporar na Base Institucional</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de Incorporação na Base Institucional (Requer Aprovação Qualidade) */}
      {incorporatingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Incorporar Novo Requisito na Base Institucional Permanente
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Item {incorporatingItem.numeroItem} — Auditoria {activePreAudit?.numeroAuditoria} ({activePreAudit?.clienteOuEntidade})
                </p>
              </div>
              <button onClick={() => setIncorporatingItem(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 italic">
              "{incorporatingItem.textoOriginalRequisito}"
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Norma / Documento de Referência</label>
                <input
                  type="text"
                  value={incorpNorma}
                  onChange={(e) => setIncorpNorma(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Modalidade de Comprovação SGQ</label>
                <select
                  value={incorpModalidade}
                  onChange={(e) => setIncorpModalidade(e.target.value as ModalidadeComprovacaoEsperada)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="DOCUMENTAL_PURO">Documental Puro</option>
                  <option value="CERTIFICADO_CALIBRACAO">Certificado de Calibração</option>
                  <option value="REGISTRO_TREINAMENTO_CHT">Treinamento / CHT</option>
                  <option value="ORDEM_SERVICO_OU_CRS">Ordem de Serviço / CRS</option>
                  <option value="REGISTRO_FOTOGRAFICO_OU_LAUDO">Foto ou Laudo Técnico</option>
                  <option value="VERIFICACAO_IN_LOCO">Verificação In Loco / Ata</option>
                  <option value="COMBINACAO_DE_EVIDENCIAS">Combinação de Evidências</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-300 font-bold mb-1">
                Resposta Institucional Proposta para Incorporação Permanente:
              </label>
              <textarea
                value={incorpResposta}
                onChange={(e) => setIncorpResposta(e.target.value)}
                rows={5}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-emerald-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={incorpAprovarDireto}
                disabled={!isQualityLeadership}
                onChange={(e) => setIncorpAprovarDireto(e.target.checked)}
                className="rounded text-emerald-600"
              />
              <span>
                Aprovar imediatamente pela Garantia da Qualidade (exige perfil ADMIN / GESTOR_SGQ)
              </span>
            </label>

            {!isQualityLeadership && (
              <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-700 text-amber-200 text-xs">
                Seu perfil não possui permissão de liderança da Qualidade (ADMIN / GESTOR_SGQ) para consolidar permanentemente na Base Institucional.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIncorporatingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmIncorporate}
                disabled={saving || !isQualityLeadership}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Aprovar e Incorporar na Base Permanente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Snapshots Imutáveis */}
      {showSnapshotsModal && activePreAudit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl p-6 space-y-4 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-400" />
                  Histórico de Snapshots Imutáveis — {activePreAudit.numeroAuditoria}
                </h3>
                <p className="text-xs text-slate-400">
                  Registros congelados no momento da emissão, protegidos contra alteração retroativa.
                </p>
              </div>
              <button onClick={() => setShowSnapshotsModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {activePreAudit.snapshots.map((snap) => (
                <button
                  key={snap.snapshotId}
                  onClick={() => setSelectedSnapshot(snap)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                    selectedSnapshot?.snapshotId === snap.snapshotId
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  v{snap.versaoSnapshot} — {new Date(snap.geradoEm).toLocaleString('pt-BR')}
                </button>
              ))}
            </div>

            {selectedSnapshot && (
              <div className="flex-1 overflow-y-auto space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-white block">Emitido por: {selectedSnapshot.geradoPorNome}</strong>
                    <span className="text-slate-400">{selectedSnapshot.observacoes}</span>
                  </div>
                  <div className="flex gap-2 text-[11px] font-mono">
                    <span className="text-emerald-400">Conf: {selectedSnapshot.resumo.equivalenciaConfirmada}</span>
                    <span className="text-amber-400">Parc: {selectedSnapshot.resumo.equivalenciaParcial}</span>
                    <span className="text-indigo-400">SemResp: {selectedSnapshot.resumo.semRespostaAprovada}</span>
                    <span className="text-rose-400">Novos: {selectedSnapshot.resumo.novoRequisito}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedSnapshot.itensSnapshot.map((sItem) => (
                    <div key={sItem.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sky-400">
                          Item {sItem.numeroItem} — {sItem.classificacao}
                        </span>
                        <span className="text-[10px] text-slate-500">{sItem.statusTratamento}</span>
                      </div>
                      <p className="text-slate-300 italic text-[11px]">"{sItem.textoOriginalRequisito}"</p>
                      {sItem.respostaAdaptadaAuditoria && (
                        <p className="text-slate-400 text-[11px] bg-slate-900 p-2 rounded border border-slate-800">
                          <strong>Resposta congelada:</strong> {sItem.respostaAdaptadaAuditoria}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
