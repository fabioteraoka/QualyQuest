import React, { useState } from 'react';
import {
  Lightbulb,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  FileCheck2,
  X,
  ExternalLink
} from 'lucide-react';
import {
  LicaoAprendidaAuditoria,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  UserProfile,
  ValidatedKnowledgeRecord
} from '../types';

interface AuditLessonsLearnedViewProps {
  lessons: LicaoAprendidaAuditoria[];
  audits: AuditoriaExternaRecord[];
  findings: ConstatacaoExternaRecord[];
  userProfile?: UserProfile | null;
  onSaveLesson: (lesson: LicaoAprendidaAuditoria) => Promise<void>;
  onCandidatarKnowledge: (lesson: LicaoAprendidaAuditoria) => Promise<void>;
  onNavigateToKnowledge?: () => void;
}

export const AuditLessonsLearnedView: React.FC<AuditLessonsLearnedViewProps> = ({
  lessons,
  audits,
  findings,
  userProfile,
  onSaveLesson,
  onCandidatarKnowledge,
  onNavigateToKnowledge,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLessonDetail, setSelectedLessonDetail] = useState<LicaoAprendidaAuditoria | null>(null);

  // Form de Nova Lição Aprendida
  const [formData, setFormData] = useState<Partial<LicaoAprendidaAuditoria>>({
    titulo: '',
    auditId: audits[0]?.id || '',
    findingId: '',
    origemTipo: 'AUDITORIA_EXTERNA',
    setor: 'Manutenção Geral',
    oQueAconteceu: '',
    porQueAconteceu: '',
    oQueFoiFeito: '',
    oQueFuncionou: '',
    oQueNaoFuncionou: '',
    oQueDevemosFazerDiferente: '',
    ondeAplicar: '',
    processosImpactados: ['Inspeção e Recebimento'],
    tags: ['Auditoria Externa', 'Lição Aprendida'],
  });

  const canEdit = userProfile?.role !== 'CONSULTA';

  const filteredLessons = lessons.filter((l) => {
    return (
      l.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.oQueAconteceu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.ondeAplicar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.setor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleOpenNew = () => {
    setFormData({
      titulo: '',
      auditId: audits[0]?.id || '',
      findingId: findings[0]?.id || '',
      origemTipo: 'AUDITORIA_EXTERNA',
      setor: 'SGQ / Garantia da Qualidade',
      oQueAconteceu: '',
      porQueAconteceu: '',
      oQueFoiFeito: '',
      oQueFuncionou: '',
      oQueNaoFuncionou: '',
      oQueDevemosFazerDiferente: '',
      ondeAplicar: '',
      processosImpactados: ['Controle de Manutenção'],
      tags: ['Auditoria', 'SGQ'],
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo || !formData.oQueAconteceu) {
      alert('Por favor, preencha o título e a descrição do que aconteceu.');
      return;
    }

    const novaLicao: LicaoAprendidaAuditoria = {
      id: formData.id || `LIC-${Date.now()}`,
      organizationId: 'org_impacto_aviation',
      auditId: formData.auditId || audits[0]?.id || 'AUD-01',
      findingId: formData.findingId || findings[0]?.id || 'FIND-01',
      origemTipo: 'AUDITORIA_EXTERNA',
      titulo: formData.titulo,
      setor: formData.setor || 'SGQ',
      processosImpactados: formData.processosImpactados || ['Manutenção'],
      oQueAconteceu: formData.oQueAconteceu,
      porQueAconteceu: formData.porQueAconteceu || '',
      oQueFoiFeito: formData.oQueFoiFeito || '',
      oQueFuncionou: formData.oQueFuncionou || '',
      oQueNaoFuncionou: formData.oQueNaoFuncionou || '',
      oQueDevemosFazerDiferente: formData.oQueDevemosFazerDiferente || '',
      ondeAplicar: formData.ondeAplicar || '',
      tags: formData.tags || ['Auditoria'],
      statusValidacao: formData.statusValidacao || 'RASCUNHO',
      candidataBaseConhecimento: false,
      autorNome: userProfile?.displayName || 'SGQ',
      criadoEm: formData.criadoEm || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveLesson(novaLicao);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
              <Lightbulb className="w-4 h-4" />
              <span>Ciclo de Aprendizado Organizacional • Fase 8</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Lições Aprendidas de Auditorias Externas
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Transformando constatações e auditorias recebidas em conhecimento institucional duradouro através das 7 perguntas essenciais.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToKnowledge && (
              <button
                onClick={onNavigateToKnowledge}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Base de Conhecimento SGQ (N1-N5)</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={handleOpenNew}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Lição Aprendida</span>
              </button>
            )}
          </div>
        </div>

        {/* Banner Pedagógico das 7 Perguntas */}
        <div className="mt-6 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <span className="font-bold">1. O que aconteceu?</span>
            <p className="text-[11px] text-emerald-800">Fato ocorrido no processo</p>
          </div>
          <div>
            <span className="font-bold">2. Por que aconteceu?</span>
            <p className="text-[11px] text-emerald-800">Causa raiz real</p>
          </div>
          <div>
            <span className="font-bold">3. O que funcionou?</span>
            <p className="text-[11px] text-emerald-800">Ações com eficácia</p>
          </div>
          <div>
            <span className="font-bold">4. Onde aplicar?</span>
            <p className="text-[11px] text-emerald-800">Transversalidade no SGQ</p>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título, conteúdo, setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grid de Cards de Lições Aprendidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLessons.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            Nenhuma lição aprendida registrada até o momento.
          </div>
        ) : (
          filteredLessons.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-emerald-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {lesson.setor}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      lesson.statusValidacao === 'VALIDADA'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {lesson.statusValidacao}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {lesson.titulo}
                  </h3>
                </div>

                {lesson.candidataBaseConhecimento ? (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>Conhecimento SGQ</span>
                  </span>
                ) : (
                  canEdit && (
                    <button
                      onClick={async () => {
                        if (confirm(`Candidatar "${lesson.titulo}" à Base de Conhecimento SGQ (N1-N5)? Será submetido para validação do Gestor SGQ.`)) {
                          await onCandidatarKnowledge(lesson);
                        }
                      }}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200 transition-colors cursor-pointer"
                    >
                      + Candidatar à Base
                    </button>
                  )
                )}
              </div>

              {/* Destaque das Perguntas */}
              <div className="text-xs space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-700">
                <p>
                  <strong className="text-slate-900">O que aconteceu:</strong> {lesson.oQueAconteceu}
                </p>
                <p>
                  <strong className="text-slate-900">Por que aconteceu:</strong> {lesson.porQueAconteceu}
                </p>
                <p>
                  <strong className="text-emerald-800">O que funcionou:</strong> {lesson.oQueFuncionou}
                </p>
                <p>
                  <strong className="text-blue-800">Onde aplicar:</strong> {lesson.ondeAplicar}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Registrado por: {lesson.autorNome}</span>
                <button
                  onClick={() => setSelectedLessonDetail(lesson)}
                  className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                >
                  Ver Detalhe Completo →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Detalhe Completo */}
      {selectedLessonDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedLessonDetail.setor}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedLessonDetail.titulo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLessonDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-800">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">1. O que aconteceu?</span>
                <p>{selectedLessonDetail.oQueAconteceu}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">2. Por que aconteceu?</span>
                <p>{selectedLessonDetail.porQueAconteceu}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">3. O que foi feito?</span>
                <p>{selectedLessonDetail.oQueFoiFeito}</p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                <span className="font-bold block mb-1">4. O que funcionou?</span>
                <p>{selectedLessonDetail.oQueFuncionou}</p>
              </div>

              {selectedLessonDetail.oQueNaoFuncionou && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-900">
                  <span className="font-bold block mb-1">5. O que não funcionou?</span>
                  <p>{selectedLessonDetail.oQueNaoFuncionou}</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-900">
                <span className="font-bold block mb-1">6. O que devemos fazer diferente?</span>
                <p>{selectedLessonDetail.oQueDevemosFazerDiferente}</p>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-900">
                <span className="font-bold block mb-1">7. Onde esse conhecimento deve ser aplicado?</span>
                <p>{selectedLessonDetail.ondeAplicar}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedLessonDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Lição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Registrar Nova Lição Aprendida de Auditoria
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Título da Lição *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alinhamento de Frequência de Calibração com Procedimento Interno"
                  value={formData.titulo || ''}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Auditoria de Origem</label>
                  <select
                    value={formData.auditId || ''}
                    onChange={(e) => setFormData({ ...formData, auditId: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    {audits.map((a) => (
                      <option key={a.id} value={a.id}>{a.numeroAuditoria} - {a.tipo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Setor Principal</label>
                  <input
                    type="text"
                    value={formData.setor || ''}
                    onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">1. O que aconteceu? *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.oQueAconteceu || ''}
                  onChange={(e) => setFormData({ ...formData, oQueAconteceu: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">2. Por que aconteceu?</label>
                <textarea
                  rows={2}
                  value={formData.porQueAconteceu || ''}
                  onChange={(e) => setFormData({ ...formData, porQueAconteceu: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">3. O que foi feito?</label>
                <textarea
                  rows={2}
                  value={formData.oQueFoiFeito || ''}
                  onChange={(e) => setFormData({ ...formData, oQueFoiFeito: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-800 font-bold mb-1">4. O que funcionou?</label>
                  <textarea
                    rows={2}
                    value={formData.oQueFuncionou || ''}
                    onChange={(e) => setFormData({ ...formData, oQueFuncionou: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-red-800 font-bold mb-1">5. O que não funcionou?</label>
                  <textarea
                    rows={2}
                    value={formData.oQueNaoFuncionou || ''}
                    onChange={(e) => setFormData({ ...formData, oQueNaoFuncionou: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-blue-800 font-bold mb-1">6. O que devemos fazer diferente?</label>
                <textarea
                  rows={2}
                  value={formData.oQueDevemosFazerDiferente || ''}
                  onChange={(e) => setFormData({ ...formData, oQueDevemosFazerDiferente: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-purple-800 font-bold mb-1">7. Onde esse conhecimento deve ser aplicado?</label>
                <textarea
                  rows={2}
                  value={formData.ondeAplicar || ''}
                  onChange={(e) => setFormData({ ...formData, ondeAplicar: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Salvar Lição Aprendida
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
