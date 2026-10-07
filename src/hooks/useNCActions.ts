import React from 'react';
import { NCRecord, ManualRecord } from '../types';
import {
  saveNonConformity,
  deleteNonConformity,
  deleteMultipleNonConformities,
  saveManual,
  deleteManual,
} from '../services/firebase/firestore';
import { saveManualToDB } from '../utils/manualsStorage';

export interface UseNCActionsProps {
  activeOrgId: string;
  user: any;
  userProfile: any;
  records: NCRecord[];
  setRecords: React.Dispatch<React.SetStateAction<NCRecord[]>>;
  manuals: ManualRecord[];
  setManuals: React.Dispatch<React.SetStateAction<ManualRecord[]>>;
  selectedNC: NCRecord | null;
  setSelectedNC: React.Dispatch<React.SetStateAction<NCRecord | null>>;
  setActiveTab: (tab: any) => void;
}

export function useNCActions({
  activeOrgId,
  user,
  userProfile,
  records,
  setRecords,
  setManuals,
  selectedNC,
  setSelectedNC,
  setActiveTab,
}: UseNCActionsProps) {
  const handleSaveNC = async (savedNC: NCRecord) => {
    try {
      if (user) {
        await saveNonConformity(activeOrgId, savedNC, userProfile);
      } else {
        setRecords((prev) => {
          const index = prev.findIndex((r) => r.id === savedNC.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = savedNC;
            return next;
          }
          return [savedNC, ...prev];
        });
      }
      setSelectedNC(savedNC);
      setActiveTab('oficial');
    } catch (e: any) {
      console.warn('Aviso ao sincronizar RNC com Firestore (mantida na sessão):', e);
      setRecords((prev) => {
        const index = prev.findIndex((r) => r.id === savedNC.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = savedNC;
          return next;
        }
        return [savedNC, ...prev];
      });
      setSelectedNC(savedNC);
      setActiveTab('oficial');
    }
  };

  const handleDeleteNC = async (id: string) => {
    try {
      if (user) {
        await deleteNonConformity(activeOrgId, id, userProfile);
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedNC?.id === id) setSelectedNC(null);
    } catch (e: any) {
      console.warn('Aviso ao sincronizar exclusão da RNC (removida na sessão):', e);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedNC?.id === id) setSelectedNC(null);
    }
  };

  const handleDeleteMultipleNC = async (ids: string[]) => {
    try {
      if (user) {
        await deleteMultipleNonConformities(activeOrgId, ids, userProfile);
      }
      setRecords((prev) => prev.filter((r) => !ids.includes(r.id)));
      if (selectedNC && ids.includes(selectedNC.id)) setSelectedNC(null);
    } catch (e: any) {
      console.warn('Aviso ao excluir múltiplas RNCs no Firestore (removidas na sessão):', e);
      setRecords((prev) => prev.filter((r) => !ids.includes(r.id)));
      if (selectedNC && ids.includes(selectedNC.id)) setSelectedNC(null);
    }
  };

  const handleSaveManual = async (manual: ManualRecord) => {
    try {
      await saveManualToDB(manual);
      if (user) {
        await saveManual(activeOrgId, manual, userProfile);
      } else {
        setManuals((prev) => {
          const idx = prev.findIndex((m) => m.id === manual.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = manual;
            return next;
          }
          return [manual, ...prev];
        });
      }
    } catch (e: any) {
      console.warn('Aviso ao salvar manual no Firestore (mantido localmente):', e);
      setManuals((prev) => {
        const idx = prev.findIndex((m) => m.id === manual.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = manual;
          return next;
        }
        return [manual, ...prev];
      });
    }
  };

  const handleDeleteManual = async (id: string) => {
    try {
      if (user) {
        await deleteManual(activeOrgId, id, userProfile);
      }
      setManuals((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      console.warn('Aviso ao excluir manual no Firestore (removido na sessão):', e);
      setManuals((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleUpdateDeadline = async (
    ncId: string,
    novaData: string,
    motivo: string,
    tipoPrazo?: 'TRATAMENTO' | 'EFICACIA'
  ) => {
    const target = records.find((r) => r.id === ncId);
    if (!target) return;
    const isEficacia =
      tipoPrazo === 'EFICACIA' ||
      target.statusGeral === 'Aguardando Eficácia' ||
      (target.statusGeral as string) === 'Em Monitoramento';

    const dataAnterior = isEficacia
      ? target.prazoEficacia || target.verificacaoEficacia?.prazoEficacia || target.verificacaoEficacia?.dataPrevista || target.prazoResposta
      : target.prazoResposta;

    const prefixo = isEficacia ? '[Eficácia] ' : '[Tratamento] ';
    const novoHistorico = [
      ...(target.historicoPrazos || []),
      {
        id: `prazo_${Date.now()}`,
        dataAnterior,
        novaData,
        motivo: `${prefixo}${motivo}`,
        alteradoEm: new Date().toISOString(),
        usuario: userProfile?.displayName || user?.email || 'Gestão da Qualidade',
      },
    ];

    const updatedNC: NCRecord = {
      ...target,
      ...(isEficacia
        ? {
            prazoEficacia: novaData,
            verificacaoEficacia: {
              ...target.verificacaoEficacia,
              prazoEficacia: novaData,
              dataPrevista: novaData,
            },
          }
        : {
            prazoResposta: novaData,
            dataLimiteTratamento: novaData,
            acaoCorretiva: {
              ...target.acaoCorretiva,
              dataPrazo: novaData,
            },
          }),
      historicoPrazos: novoHistorico,
      atualizadoEm: new Date().toISOString(),
    };

    try {
      await saveNonConformity(activeOrgId, updatedNC, userProfile);
    } catch (e) {
      console.error('Erro ao prorrogar prazo no Firestore:', e);
    }
  };

  return {
    handleSaveNC,
    handleDeleteNC,
    handleDeleteMultipleNC,
    handleSaveManual,
    handleDeleteManual,
    handleUpdateDeadline,
  };
}
