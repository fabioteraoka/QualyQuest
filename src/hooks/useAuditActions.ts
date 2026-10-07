import React from 'react';
import {
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  LicaoAprendidaAuditoria,
} from '../types';
import { RequisitoAuditoriaExterna } from '../types/auditRequirements';
import {
  saveExternalAudit,
  saveAuditFinding,
  deleteAuditFinding,
  criarRNCFromFinding,
  saveAuditLesson,
  promoverLicaoParaConhecimento,
} from '../services/firebase/firestore';
import {
  saveAuditRequirement,
  saveAuditRequirementsBatch,
  cancelAuditAndCascadingItems,
  restoreCancelledAudit,
  archiveAudit,
  deleteAuditWithDependencyCheck,
} from '../services/firebase/auditRequirementsFirestore';

export interface UseAuditActionsProps {
  activeOrgId: string;
  user: any;
  userProfile: any;
  setExternalAudits: React.Dispatch<React.SetStateAction<AuditoriaExternaRecord[]>>;
  setAuditRequirements: React.Dispatch<React.SetStateAction<RequisitoAuditoriaExterna[]>>;
  setAuditFindings: React.Dispatch<React.SetStateAction<ConstatacaoExternaRecord[]>>;
  setAuditLessons: React.Dispatch<React.SetStateAction<LicaoAprendidaAuditoria[]>>;
}

export function useAuditActions({
  activeOrgId,
  user,
  userProfile,
  setExternalAudits,
  setAuditRequirements,
  setAuditFindings,
  setAuditLessons,
}: UseAuditActionsProps) {
  const handleSaveAudit = async (audit: AuditoriaExternaRecord) => {
    try {
      if (user) {
        await saveExternalAudit(activeOrgId, audit, userProfile);
      }
      setExternalAudits((prev) => {
        const idx = prev.findIndex((a) => a.id === audit.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = audit;
          return next;
        }
        return [audit, ...prev];
      });
    } catch (e: any) {
      console.warn('Aviso ao salvar auditoria externa no Firestore (mantida na sessão):', e);
      setExternalAudits((prev) => {
        const idx = prev.findIndex((a) => a.id === audit.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = audit;
          return next;
        }
        return [audit, ...prev];
      });
    }
  };

  const handleDeleteAudit = async (auditId: string, forceDelete: boolean = false) => {
    if (user) {
      await deleteAuditWithDependencyCheck(activeOrgId, auditId, userProfile, forceDelete);
    }
    setExternalAudits((prev) => prev.filter((a) => a.id !== auditId));
    setAuditRequirements((prev) => prev.filter((r) => r.auditId !== auditId));
  };

  const handleCancelAudit = async (auditId: string, motivo: string) => {
    if (user) {
      await cancelAuditAndCascadingItems(activeOrgId, auditId, motivo, userProfile);
    }
    setExternalAudits((prev) =>
      prev.map((a) =>
        a.id === auditId
          ? { ...a, status: 'CANCELADA', motivoCancelamento: motivo, canceladoEm: new Date().toISOString() }
          : a
      )
    );
    setAuditRequirements((prev) =>
      prev.map((r) =>
        r.auditId === auditId
          ? { ...r, statusRegistro: 'CANCELADO', estadoAcompanhamento: 'SUSPENSO_CANCELADO', motivoCancelamento: motivo }
          : r
      )
    );
  };

  const handleRestoreAudit = async (auditId: string) => {
    if (user) {
      await restoreCancelledAudit(activeOrgId, auditId, userProfile);
    }
    setExternalAudits((prev) =>
      prev.map((a) => (a.id === auditId ? { ...a, status: 'RECEBIDA', motivoCancelamento: undefined } : a))
    );
    setAuditRequirements((prev) =>
      prev.map((r) => (r.auditId === auditId ? { ...r, statusRegistro: 'ATIVO' } : r))
    );
  };

  const handleArchiveAudit = async (auditId: string) => {
    if (user) {
      await archiveAudit(activeOrgId, auditId, userProfile);
    }
    setExternalAudits((prev) =>
      prev.map((a) => (a.id === auditId ? { ...a, status: 'ARQUIVADA', isArquivada: true } : a))
    );
  };

  const handleSaveAuditRequirement = async (req: RequisitoAuditoriaExterna) => {
    if (user) {
      await saveAuditRequirement(activeOrgId, req, userProfile);
    }
    setAuditRequirements((prev) => {
      const idx = prev.findIndex((r) => r.id === req.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = req;
        return next;
      }
      return [req, ...prev];
    });
  };

  const handleSaveBatchAuditRequirements = async (reqs: RequisitoAuditoriaExterna[]) => {
    if (user) {
      await saveAuditRequirementsBatch(activeOrgId, reqs, userProfile);
    }
    setAuditRequirements((prev) => {
      const ids = new Set(reqs.map((r) => r.id));
      return [...reqs, ...prev.filter((r) => !ids.has(r.id))];
    });
  };

  const handleSaveFinding = async (finding: ConstatacaoExternaRecord) => {
    if (user) {
      await saveAuditFinding(activeOrgId, finding, userProfile);
    }
    setAuditFindings((prev) => {
      const idx = prev.findIndex((f) => f.id === finding.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = finding;
        return next;
      }
      return [finding, ...prev];
    });
  };

  const handleDeleteFinding = async (findingId: string) => {
    if (user) {
      await deleteAuditFinding(activeOrgId, findingId, userProfile);
    }
    setAuditFindings((prev) => prev.filter((f) => f.id !== findingId));
  };

  const handleSaveLesson = async (lesson: LicaoAprendidaAuditoria) => {
    if (user) {
      await saveAuditLesson(activeOrgId, lesson, userProfile);
    }
    setAuditLessons((prev) => {
      const idx = prev.findIndex((l) => l.id === lesson.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = lesson;
        return next;
      }
      return [lesson, ...prev];
    });
  };

  const handleCriarRNCFromFinding = async (finding: ConstatacaoExternaRecord, audit?: AuditoriaExternaRecord) => {
    return await criarRNCFromFinding(activeOrgId, finding, audit, userProfile);
  };

  const handleCandidatarKnowledge = async (lesson: LicaoAprendidaAuditoria) => {
    if (user) {
      await promoverLicaoParaConhecimento(activeOrgId, lesson, userProfile);
    }
  };

  return {
    handleSaveAudit,
    handleDeleteAudit,
    handleCancelAudit,
    handleRestoreAudit,
    handleArchiveAudit,
    handleSaveAuditRequirement,
    handleSaveBatchAuditRequirements,
    handleSaveFinding,
    handleDeleteFinding,
    handleSaveLesson,
    handleCriarRNCFromFinding,
    handleCandidatarKnowledge,
  };
}
