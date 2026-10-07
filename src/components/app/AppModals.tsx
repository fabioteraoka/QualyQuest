import React from 'react';
import { NCRecord, ManualRecord, ComparacaoRNCRecord, ValidatedKnowledgeRecord, OrganizationRecord } from '../../types';
import { InitialSetupChecklistModal } from '../InitialSetupChecklistModal';
import { ComplianceAuditModal } from '../ComplianceAuditModal';
import { TechnicalAuditModal } from '../TechnicalAuditModal';
import { AuthModal } from '../AuthModal';
import { FirebaseDiagnosticModal } from '../FirebaseDiagnosticModal';
import { LocalDataMigrationModal } from '../LocalDataMigrationModal';

export interface AppModalsProps {
  isChecklistModalOpen: boolean;
  setIsChecklistModalOpen: (open: boolean) => void;
  activeOrganization: OrganizationRecord | null;
  setActiveOrganization: (org: OrganizationRecord | null) => void;
  setActiveTab: (tab: any) => void;

  isAuditModalOpen: boolean;
  setIsAuditModalOpen: (open: boolean) => void;
  auditTargetNC: NCRecord | null;
  setAuditTargetNC: (nc: NCRecord | null) => void;
  manuals: ManualRecord[];
  onApplyAuditSuggestions: (updates: Partial<NCRecord>) => Promise<void>;

  isTechnicalAuditModalOpen: boolean;
  setIsTechnicalAuditModalOpen: (open: boolean) => void;
  records: NCRecord[];
  comparacoes: ComparacaoRNCRecord[];
  knowledgeList: ValidatedKnowledgeRecord[];
  userProfile: any;

  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;

  isDiagnosticsModalOpen: boolean;
  setIsDiagnosticsModalOpen: (open: boolean) => void;

  isMigrationModalOpen: boolean;
  setIsMigrationModalOpen: (open: boolean) => void;
  activeOrgId: string;
}

export const AppModals: React.FC<AppModalsProps> = ({
  isChecklistModalOpen,
  setIsChecklistModalOpen,
  activeOrganization,
  setActiveOrganization,
  setActiveTab,

  isAuditModalOpen,
  setIsAuditModalOpen,
  auditTargetNC,
  setAuditTargetNC,
  manuals,
  onApplyAuditSuggestions,

  isTechnicalAuditModalOpen,
  setIsTechnicalAuditModalOpen,
  records,
  comparacoes,
  knowledgeList,
  userProfile,

  isAuthModalOpen,
  setIsAuthModalOpen,

  isDiagnosticsModalOpen,
  setIsDiagnosticsModalOpen,

  isMigrationModalOpen,
  setIsMigrationModalOpen,
  activeOrgId,
}) => {
  return (
    <>
      {/* Modal de Checklist de Implantação de Novo Cliente */}
      <InitialSetupChecklistModal
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
        organization={activeOrganization}
        onNavigateToTab={(tab) => {
          setIsChecklistModalOpen(false);
          setActiveTab(tab as any);
        }}
        onUpdateOrganization={(updated) => setActiveOrganization(updated)}
      />

      {/* Global AI Compliance Audit Modal */}
      <ComplianceAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setAuditTargetNC(null);
        }}
        nc={auditTargetNC}
        manuals={manuals}
        onApplySuggestions={onApplyAuditSuggestions}
      />

      {/* Technical Audit Modal */}
      <TechnicalAuditModal
        isOpen={isTechnicalAuditModalOpen}
        onClose={() => setIsTechnicalAuditModalOpen(false)}
        records={records}
        manuals={manuals}
        comparacoes={comparacoes}
        knowledgeList={knowledgeList}
        userProfile={userProfile}
      />

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Firebase & Firestore Diagnostic Modal */}
      <FirebaseDiagnosticModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenMigration={() => setIsMigrationModalOpen(true)}
        ncCount={records.length}
        manualsCount={manuals.length}
      />

      {/* Local Browser Data Migration Modal (IndexedDB to Cloud Firestore) */}
      <LocalDataMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        activeOrgId={activeOrgId}
        userProfile={userProfile}
        currentRecords={records}
        currentManuals={manuals}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />
    </>
  );
};
