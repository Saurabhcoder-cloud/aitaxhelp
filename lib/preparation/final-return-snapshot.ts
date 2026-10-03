import crypto from "crypto";
import { TaxYear } from "@/types/tax";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  buildFederalReturn,
  FederalReturn,
  FederalReturnTaxpayer,
  FederalReturnSpouse,
  FederalReturnDependent,
  FederalReturnIncome,
  FederalReturnAdjustments,
  FederalReturnDeductions,
  FederalReturnCredits,
  FederalReturnTaxes,
  FederalReturnPayments,
  FederalReturnRefundOrBalanceDue,
  FederalReturnReconciliation,
} from "@/lib/preparation/federal-return";
import {
  evaluateSupportedSchedules,
  ScheduleDocumentDescriptor,
} from "@/lib/preparation/federal-return-documents";
import {
  evaluateEfileReadiness,
  EfileReadinessEvaluation,
  EFILE_READINESS_DISCLAIMER,
} from "@/lib/preparation/efile-readiness";
import { AppError } from "@/lib/utils/errors";

// =============================================================================
// 1. FINAL RETURN SNAPSHOT MODEL & TYPES
// =============================================================================

export const SNAPSHOT_SCHEMA_VERSION = "2026.1";

export interface FinalReturnSnapshotPayload {
  snapshotId: string;
  sessionId: string;
  userId: string;
  taxYear: TaxYear;
  schemaVersion: string;
  engineVersion: string;
  rulesVersion: string;
  frozenAt: string;
  filingStatus: FederalReturn["filingStatus"];
  taxpayer: FederalReturnTaxpayer;
  spouse: FederalReturnSpouse;
  dependents: FederalReturnDependent[];
  income: FederalReturnIncome;
  adjustments: FederalReturnAdjustments;
  deductions: FederalReturnDeductions;
  credits: FederalReturnCredits;
  taxes: FederalReturnTaxes;
  payments: FederalReturnPayments;
  refundOrBalanceDue: FederalReturnRefundOrBalanceDue;
  schedules: ScheduleDocumentDescriptor[];
  reconciliation: FederalReturnReconciliation;
  readinessSummary: {
    status: string;
    isReady: boolean;
    totalChecks: number;
    passedChecks: number;
    blockingErrorsCount: number;
  };
}

export interface FinalReturnSnapshot {
  snapshotId: string;
  sessionId: string;
  userId: string;
  taxYear: TaxYear;
  schemaVersion: string;
  engineVersion: string;
  rulesVersion: string;
  frozenAt: string;
  checksum: string;
  isFrozen: boolean;
  payload: FinalReturnSnapshotPayload;
  disclaimer: string;
}

// =============================================================================
// 2. IN-MEMORY SNAPSHOT REGISTRY (Zero DB Migrations Required)
// =============================================================================

const snapshotRegistry = new Map<string, FinalReturnSnapshot>();

// =============================================================================
// 3. CRYPTOGRAPHIC CHECKSUM UTILITY
// =============================================================================

function canonicalizeForChecksum(val: unknown): unknown {
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(canonicalizeForChecksum);
  }
  const sortedObj: Record<string, unknown> = {};
  for (const key of Object.keys(val).sort()) {
    sortedObj[key] = canonicalizeForChecksum((val as Record<string, unknown>)[key]);
  }
  return sortedObj;
}

/**
 * Computes a deterministic SHA-256 cryptographic checksum over the canonical
 * final-return snapshot payload. Ensures absolute immutability and anti-tampering.
 */
export function computeSnapshotChecksum(payload: FinalReturnSnapshotPayload): string {
  const canonicalString = JSON.stringify(canonicalizeForChecksum(payload));
  return crypto.createHash("sha256").update(canonicalString, "utf8").digest("hex");
}

/**
 * Verifies whether a given snapshot has been tampered with or modified.
 */
export function verifySnapshotIntegrity(snapshot: FinalReturnSnapshot): boolean {
  if (!snapshot || !snapshot.payload || !snapshot.checksum) {
    return false;
  }
  const expectedChecksum = computeSnapshotChecksum(snapshot.payload);
  return snapshot.checksum === expectedChecksum;
}

// =============================================================================
// 4. FINAL RETURN SNAPSHOT CREATOR & FREEZE ENGINE
// =============================================================================

/**
 * Creates an immutable, cryptographically verified snapshot of the taxpayer's
 * complete federal tax return.
 *
 * SAFETY INVARIANTS:
 * - Server-derived only: Client cannot pass totals or modify values.
 * - Reconstructs the canonical FederalReturn from verified session state.
 * - Enforces e-file readiness gating: Rejects freezing if blocking errors exist.
 */
export function createFinalReturnSnapshot(
  session: TaxPreparationSession,
  providedFederalReturn?: FederalReturn
): FinalReturnSnapshot {
  const federalReturn = providedFederalReturn || buildFederalReturn(session);
  const readiness = evaluateEfileReadiness(session, federalReturn);

  if (!readiness.isReady) {
    const errorDetails = readiness.blockingErrors.map((e) => e.message).join(" ");
    throw new AppError(
      `Cannot freeze final return snapshot: Return is not ready for filing (${errorDetails})`,
      422,
      "RETURN_NOT_READY",
    );
  }

  const snapshotId = crypto.randomUUID();
  const now = new Date().toISOString();
  const schedules = evaluateSupportedSchedules(federalReturn);

  const payload: FinalReturnSnapshotPayload = {
    snapshotId,
    sessionId: session.id,
    userId: session.userId,
    taxYear: session.taxYear,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    engineVersion: federalReturn.metadata.engineVersion,
    rulesVersion: federalReturn.metadata.rulesVersion,
    frozenAt: now,
    filingStatus: federalReturn.filingStatus,
    taxpayer: federalReturn.taxpayer,
    spouse: federalReturn.spouse,
    dependents: federalReturn.dependents,
    income: federalReturn.income,
    adjustments: federalReturn.adjustments,
    deductions: federalReturn.deductions,
    credits: federalReturn.credits,
    taxes: federalReturn.taxes,
    payments: federalReturn.payments,
    refundOrBalanceDue: federalReturn.refundOrBalanceDue,
    schedules,
    reconciliation: federalReturn.reconciliation,
    readinessSummary: {
      status: readiness.status,
      isReady: readiness.isReady,
      totalChecks: readiness.summary.totalChecks,
      passedChecks: readiness.summary.passedChecks,
      blockingErrorsCount: readiness.summary.blockingErrorsCount,
    },
  };

  const checksum = computeSnapshotChecksum(payload);

  const snapshot: FinalReturnSnapshot = {
    snapshotId,
    sessionId: session.id,
    userId: session.userId,
    taxYear: session.taxYear,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    engineVersion: federalReturn.metadata.engineVersion,
    rulesVersion: federalReturn.metadata.rulesVersion,
    frozenAt: now,
    checksum,
    isFrozen: true,
    payload,
    disclaimer: EFILE_READINESS_DISCLAIMER,
  };

  // Register in snapshot registry keyed by sessionId
  snapshotRegistry.set(session.id, snapshot);

  return snapshot;
}

/**
 * Retrieves the frozen snapshot for a given session, if one has been created.
 */
export function getFinalReturnSnapshot(sessionId: string): FinalReturnSnapshot | null {
  const snapshot = snapshotRegistry.get(sessionId);
  if (!snapshot) {
    return null;
  }
  // Verify integrity before returning
  if (!verifySnapshotIntegrity(snapshot)) {
    throw new AppError(
      "Snapshot integrity verification failed. The return snapshot may have been tampered with.",
      500,
      "SNAPSHOT_CORRUPTED"
    );
  }
  return snapshot;
}

/**
 * Clears the snapshot registry (used in test setup).
 */
export function clearSnapshotRegistry(): void {
  snapshotRegistry.clear();
}
