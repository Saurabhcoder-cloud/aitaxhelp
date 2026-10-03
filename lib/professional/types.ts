import { TaxYear, TaxFilingStatus } from "@/types/tax";
import { FederalReturn } from "@/lib/preparation/federal-return";
import { FederalReturnDocumentPackage } from "@/lib/preparation/federal-return-documents";
import { EfileReadinessEvaluation } from "@/lib/preparation/efile-readiness";
import { StateTaxSummary } from "@/lib/state-tax/summary";

// =============================================================================
// 1. CANONICAL CASE STATUSES & ENUMS
// =============================================================================

export type ProfessionalReviewCaseStatus =
  | "REQUESTED"
  | "UNASSIGNED"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "READY_FOR_FINAL_REVIEW"
  | "REVIEW_COMPLETED"
  | "CLOSED"
  | "CANCELLED";

export type ProfessionalReviewPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type ProfessionalReviewType = "cpa" | "enrolled_agent" | "tax_professional";

export type ReviewActorRole = "taxpayer" | "professional" | "admin" | "system";

// 14 Canonical review sections
export type ReviewCommentSection =
  | "taxpayer_profile"
  | "filing_status"
  | "spouse"
  | "dependents"
  | "w2_income"
  | "1099_income"
  | "business_income"
  | "adjustments"
  | "deductions"
  | "credits"
  | "federal_return"
  | "state_return"
  | "documents"
  | "efile_readiness";

export type ReviewCommentSeverity = "INFO" | "WARNING" | "REQUIRES_ACTION";

export type ReviewCommentStatus = "OPEN" | "RESOLVED";

export type ReviewEventType =
  | "CASE_CREATED"
  | "PROFESSIONAL_ASSIGNED"
  | "REVIEW_STARTED"
  | "COMMENT_ADDED"
  | "COMMENT_RESOLVED"
  | "CHANGES_REQUESTED"
  | "TAXPAYER_RESUBMITTED"
  | "READY_FOR_FINAL_REVIEW"
  | "REVIEW_COMPLETED"
  | "CASE_CLOSED"
  | "CASE_CANCELLED"
  | "STATUS_CHANGED";

// =============================================================================
// 2. COMMENT & FINDINGS MODEL
// =============================================================================

export interface ProfessionalReviewComment {
  id: string;
  caseId: string;
  authorId: string;
  authorName: string;
  authorRole: ReviewActorRole;
  section: ReviewCommentSection;
  message: string;
  severity: ReviewCommentSeverity;
  status: ReviewCommentStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
}

// =============================================================================
// 3. AUDIT & TIMELINE EVENTS
// =============================================================================

export interface ReviewEvent {
  id: string;
  caseId: string;
  sessionId?: string;
  actorId: string;
  actorName: string;
  actorRole: ReviewActorRole;
  eventType: ReviewEventType;
  description: string;
  fromStatus?: ProfessionalReviewCaseStatus;
  toStatus?: ProfessionalReviewCaseStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// =============================================================================
// 4. REVIEW SNAPSHOT (DURABLE AT REVIEW TIME)
// =============================================================================

export interface ProfessionalReviewSnapshot {
  snapshotId: string;
  reconstructedAt: string;
  taxYear: TaxYear;
  filingStatus: string;
  federalReturn: FederalReturn;
  stateSummary?: StateTaxSummary | null;
  efileReadiness: EfileReadinessEvaluation;
  documentPackage: FederalReturnDocumentPackage;
  checksum: string;
}

// =============================================================================
// 5. CANONICAL PROFESSIONAL REVIEW CASE
// =============================================================================

export interface ProfessionalReviewCase {
  id: string;
  userId: string; // Taxpayer ID
  taxpayerName: string;
  taxpayerEmail: string;
  sessionId: string;
  leadId?: string;
  reviewType: ProfessionalReviewType;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  status: ProfessionalReviewCaseStatus;
  priority: ProfessionalReviewPriority;
  assignedProfessionalId?: string;
  assignedProfessionalName?: string;
  assignedAt?: string;
  requestedAt: string;
  lastReviewedAt?: string;
  completedAt?: string;
  closedAt?: string;
  taxpayerNotes?: string;
  professionalNotes?: string;
  comments: ProfessionalReviewComment[];
  events: ReviewEvent[];
  snapshot?: ProfessionalReviewSnapshot;
  hasOpenActionRequired: boolean;
  openCommentsCount: number;
  resolvedCommentsCount: number;
  createdAt: string;
  updatedAt: string;
}
