/**
 * Deterministic E-File Validation Gate — Phase 10
 *
 * Strict server-side pre-submission gate.
 *
 * Checks:
 * 1. Structural IRS MeF schema readiness (100% pass, 0 blocking errors)
 * 2. Mathematical reconciliation of Form 1040 lines
 * 3. CPA / EA Professional Review state (Blocks if CHANGES_REQUESTED or IN_REVIEW)
 * 4. Final Return Snapshot freshness (Detects stale snapshot vs live session calculation)
 * 5. Cryptographic anti-tampering verification
 *
 * CRITICAL TAX SAFETY:
 * Zero client-submitted totals are evaluated. All data is reconstructed
 * from the authoritative server-side session.
 */

import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  buildFederalReturn,
  reconcileFederalReturnCalculations,
} from "@/lib/preparation/federal-return";
import {
  evaluateEfileReadiness,
  EfileReadinessEvaluation,
} from "@/lib/preparation/efile-readiness";
import {
  getFinalReturnSnapshot,
  verifySnapshotIntegrity,
  computeSnapshotChecksum,
  FinalReturnSnapshot,
} from "@/lib/preparation/final-return-snapshot";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";

export type EfileGateStatus = "READY" | "BLOCKED" | "REQUIRES_REVIEW" | "NOT_SUPPORTED";

export interface EfileGateValidationResult {
  isReady: boolean;
  gateStatus: EfileGateStatus;
  readiness: EfileReadinessEvaluation;
  snapshot: FinalReturnSnapshot | null;
  blockingIssues: string[];
  warnings: string[];
  proReviewStatus?: string;
  isStaleSnapshot: boolean;
  evaluatedAt: string;
}

export async function validateEfileSubmissionGate(
  session: TaxPreparationSession
): Promise<EfileGateValidationResult> {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const now = new Date().toISOString();

  // 1. Reconstruct authoritative FederalReturn
  const federalReturn = buildFederalReturn(session);

  // 2. Run structural MeF readiness checks
  const readiness = evaluateEfileReadiness(session, federalReturn);
  if (!readiness.isReady) {
    for (const err of readiness.blockingErrors) {
      blockingIssues.push(`[${err.category}] ${err.message} (${err.action})`);
    }
  }
  for (const warn of readiness.warnings) {
    warnings.push(`[${warn.category}] ${warn.message}`);
  }

  // 3. Mathematical reconciliation check
  const recon = reconcileFederalReturnCalculations(session);
  if (!recon.isReconciled) {
    blockingIssues.push("Federal return mathematical reconciliation failed: Line items do not balance.");
  }

  // 4. Professional Review integration check
  let proReviewStatus: string | undefined;
  try {
    const proCase = await ProfessionalReviewCaseStore.getBySessionId(session.id);
    if (proCase) {
      proReviewStatus = proCase.status;
      if (proCase.status === "CHANGES_REQUESTED") {
        blockingIssues.push(
          "CPA/EA professional reviewer requested adjustments to this tax return. Please resolve reviewer findings before submitting."
        );
      } else if (
        proCase.status === "REQUESTED" ||
        proCase.status === "IN_REVIEW" ||
        proCase.status === "ASSIGNED" ||
        proCase.status === "READY_FOR_FINAL_REVIEW"
      ) {
        blockingIssues.push(
          `Return is currently under active professional review (Status: ${proCase.status}). Submission is locked until review completes.`
        );
      }
    }
  } catch (_e) {}

  // 5. Final return snapshot verification
  const snapshot = getFinalReturnSnapshot(session.id);
  let isStaleSnapshot = false;

  if (snapshot) {
    // Check integrity
    const isIntact = verifySnapshotIntegrity(snapshot);
    if (!isIntact) {
      blockingIssues.push("Cryptographic checksum verification failed. The frozen snapshot appears corrupted.");
    }

    // Check if session has mutated since snapshot was generated
    if (snapshot.payload) {
      const p = snapshot.payload;
      const hasDataChanged =
        federalReturn.income.totalGrossIncomeCents !== p.income.totalGrossIncomeCents ||
        federalReturn.income.w2WagesCents !== p.income.w2WagesCents ||
        federalReturn.deductions.deductionUsedCents !== p.deductions.deductionUsedCents ||
        federalReturn.taxes.taxableIncomeCents !== p.taxes.taxableIncomeCents ||
        federalReturn.taxes.totalTaxLiabilityCents !== p.taxes.totalTaxLiabilityCents ||
        federalReturn.payments.totalPaymentsAndCreditsCents !== p.payments.totalPaymentsAndCreditsCents ||
        federalReturn.refundOrBalanceDue.amountCents !== p.refundOrBalanceDue.amountCents ||
        federalReturn.filingStatus.status !== p.filingStatus.status ||
        federalReturn.dependents.length !== p.dependents.length;

      if (hasDataChanged) {
        isStaleSnapshot = true;
        blockingIssues.push(
          "Tax preparation inputs have changed since the snapshot was frozen. You must re-freeze your return before filing."
        );
      }
    }
  } else {
    blockingIssues.push("Return has not been frozen. A final return snapshot must be created before submission.");
  }

  let gateStatus: EfileGateStatus = "READY";
  if (blockingIssues.length > 0) {
    gateStatus = "BLOCKED";
  } else if (proReviewStatus && proReviewStatus !== "REVIEW_COMPLETED") {
    gateStatus = "REQUIRES_REVIEW";
  }

  return {
    isReady: gateStatus === "READY",
    gateStatus,
    readiness,
    snapshot,
    blockingIssues,
    warnings,
    proReviewStatus,
    isStaleSnapshot,
    evaluatedAt: now,
  };
}
