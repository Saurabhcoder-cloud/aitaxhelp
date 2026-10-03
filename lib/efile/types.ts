/**
 * Federal Electronic Filing (E-File) Domain Model — Phase 10
 *
 * Provides type-safe contracts for:
 * 1. EfileSubmission records and lifecycle state
 * 2. Audit events (EfileSubmissionEvent)
 * 3. Canonical Provider-Neutral E-File Payload (CanonicalEfilePayload)
 * 4. Provider Response normalization & webhook contracts
 * 5. Provider Abstraction (IFederalEfileProvider)
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * - Deterministic tax engine is the sole authority for tax values.
 * - Server reconstructs and validates the canonical FederalReturn.
 * - Does not invent IRS MeF XML schemas; produces a canonical intermediate representation.
 * - Never claims a return has been filed or accepted by the IRS without verified provider acknowledgement.
 */

import { TaxFilingStatus, TaxYear } from "@/types/tax";
import { SubmissionLifecycleStatus } from "./submission-lifecycle";
import { FinalReturnSnapshot } from "@/lib/preparation/final-return-snapshot";

// =============================================================================
// 1. SUBMISSION ENTITY
// =============================================================================

export interface EfileSubmission {
  id: string;
  preparationSessionId: string;
  userId: string;
  taxYear: TaxYear;
  snapshotId: string;
  snapshotHash: string;
  provider: string; // e.g. "mock_provider", "authorized_mef_provider", "disconnected"
  providerSubmissionId?: string;
  providerCorrelationId?: string;
  status: SubmissionLifecycleStatus;
  idempotencyKey: string;
  isTestSubmission: boolean;
  submittedAt?: string;
  acknowledgedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
  rejectionCategory?: string;
  rejectionRuleNumber?: string;
  taxpayerAction?: string;
  lastProviderResponseAt?: string;
  retryCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 2. AUDIT & EVENT ENTITY
// =============================================================================

export type EfileActorType =
  | "taxpayer"
  | "system"
  | "provider_webhook"
  | "admin"
  | "professional";

export interface EfileSubmissionEvent {
  id: string;
  submissionId: string;
  preparationSessionId: string;
  userId: string;
  eventType: string; // e.g. "STATUS_TRANSITION", "WEBHOOK_RECEIVED", "RETRY_TRIGGERED"
  fromStatus?: SubmissionLifecycleStatus;
  toStatus: SubmissionLifecycleStatus;
  actor: EfileActorType;
  details?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// =============================================================================
// 3. CANONICAL PROVIDER-NEUTRAL SUBMISSION PAYLOAD
// =============================================================================

export interface CanonicalEfileAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CanonicalEfileTaxpayer {
  fullName: string;
  firstName: string;
  lastName: string;
  ssnMasked: string; // E.g. "***-**-1234"
  dateOfBirth?: string;
  residentialAddress: CanonicalEfileAddress;
}

export interface CanonicalEfileSpouse {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  ssnMasked?: string;
  dateOfBirth?: string;
}

export interface CanonicalEfileDependent {
  id: string;
  firstName: string;
  lastName: string;
  ssnMasked: string;
  relationship: string;
  qualifiesForChildTaxCredit: boolean;
  qualifiesForOtherDependentCredit: boolean;
}

export interface Canonical1040LineSummary {
  w2WagesCents: number;
  totalIncomeCents: number;
  adjustmentsCents: number;
  adjustedGrossIncomeCents: number;
  deductionType: "standard" | "itemized";
  deductionUsedCents: number;
  taxableIncomeCents: number;
  tentativeTaxCents: number;
  nonRefundableCreditsCents: number;
  taxAfterCreditsCents: number;
  otherTaxesCents: number; // e.g. Self-employment tax
  totalTaxCents: number;
  totalWithholdingCents: number;
  refundableCreditsCents: number;
  totalPaymentsCents: number;
  refundOrBalanceType: "refund" | "balance_due" | "zero";
  refundAmountCents: number;
  amountOwedCents: number;
}

export interface CanonicalEfileScheduleRecord {
  scheduleCode: string;
  scheduleName: string;
  formNumber: string;
}

export interface CanonicalEfilePayload {
  header: {
    transmissionId: string;
    schemaVersion: string;
    taxYear: TaxYear;
    timestamp: string;
    filingStatus: TaxFilingStatus;
    softwareId: string;
    isTest: boolean;
    checksum: string;
    disclaimer: string;
  };
  taxpayer: CanonicalEfileTaxpayer;
  spouse?: CanonicalEfileSpouse;
  dependents: CanonicalEfileDependent[];
  lines: Canonical1040LineSummary;
  schedules: CanonicalEfileScheduleRecord[];
  metadata: {
    sessionId: string;
    snapshotId: string;
    engineVersion: string;
    rulesVersion: string;
    generatedAt: string;
  };
}

// =============================================================================
// 4. PROVIDER CONTRACT INTERFACES & NORMALIZED RESPONSES
// =============================================================================

export type ProviderNormalizedResponseType =
  | "PROVIDER_RECEIVED"
  | "PROVIDER_VALIDATED"
  | "IRS_ACKNOWLEDGED"
  | "IRS_ACCEPTED"
  | "IRS_REJECTED"
  | "VALIDATION_FAILED"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "DUPLICATE_SUBMISSION"
  | "UNKNOWN";

export interface ProviderValidationResult {
  isValid: boolean;
  mefSchemaVersion: string;
  errors: Array<{
    ruleNumber: string;
    path: string;
    description: string;
  }>;
}

export interface ProviderSubmissionResult {
  success: boolean;
  providerSubmissionId?: string;
  providerCorrelationId?: string;
  status: SubmissionLifecycleStatus;
  responseType: ProviderNormalizedResponseType;
  message: string;
  irsTransmissionTimestamp?: string;
  isSimulated?: boolean;
  rawResponse?: unknown;
}

export interface ProviderStatusResult {
  submissionId: string;
  providerSubmissionId: string;
  status: SubmissionLifecycleStatus;
  responseType: ProviderNormalizedResponseType;
  irsSubmissionId?: string;
  receivedTimestamp?: string;
  acceptedTimestamp?: string;
  rejectedTimestamp?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  rejectionRuleNumber?: string;
  taxpayerAction?: string;
  message: string;
  rawResponse?: unknown;
}

export interface ProviderRejectionDetails {
  submissionId: string;
  rejectionCode: string;
  category: string;
  irsRuleNumber: string;
  description: string;
  taxpayerAction: string;
}

export interface ProviderCapabilities {
  providerId: string;
  providerName: string;
  supportsRealTransmission: boolean;
  supportsWebhooks: boolean;
  supportsStatusPolling: boolean;
  supportsCancellation: boolean;
  supportedTaxYears: TaxYear[];
  isMock: boolean;
}

export interface ProviderWebhookPayload {
  provider: string;
  providerSubmissionId: string;
  providerCorrelationId?: string;
  eventType: "ACKNOWLEDGED" | "ACCEPTED" | "REJECTED" | "ERROR";
  irsSubmissionId?: string;
  timestamp: string;
  rejectionDetails?: {
    code: string;
    ruleNumber: string;
    message: string;
    action: string;
  };
  signature?: string;
  rawPayload?: unknown;
}

export interface WebhookProcessingResult {
  processed: boolean;
  duplicate: boolean;
  submissionId?: string;
  previousStatus?: SubmissionLifecycleStatus;
  newStatus?: SubmissionLifecycleStatus;
  message: string;
}

// =============================================================================
// 5. PROVIDER ADAPTER INTERFACE
// =============================================================================

export interface IFederalEfileProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly isConnected: boolean;
  readonly isMock: boolean;

  getCapabilities(): ProviderCapabilities;
  validateSubmission(snapshot: FinalReturnSnapshot): Promise<ProviderValidationResult>;
  submit(
    snapshot: FinalReturnSnapshot,
    payload: CanonicalEfilePayload,
    idempotencyKey: string
  ): Promise<ProviderSubmissionResult>;
  getSubmissionStatus(providerSubmissionId: string): Promise<ProviderStatusResult>;
  parseAcknowledgement(rawPayload: unknown): ProviderStatusResult;
  parseRejection(rawPayload: unknown): ProviderRejectionDetails;
  verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean;
  cancelSubmission?(providerSubmissionId: string): Promise<boolean>;
}
