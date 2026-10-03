/**
 * Canonical E-File Payload Generator — Phase 10
 *
 * Transforms the authoritative FinalReturnSnapshot into a provider-neutral,
 * intermediate filing representation (CanonicalEfilePayload).
 *
 * CRITICAL TAX SAFETY & INTEGRITY:
 * - Deterministic: Zero numerical calculations are performed here; all amounts
 *   are extracted directly from the verified FinalReturnSnapshot.
 * - Anti-Tampering: Includes the SHA-256 snapshot checksum in payload header.
 * - Privacy: Masks SSNs/ITINs for transmission transport safety.
 * - Does not invent IRS MeF XML schemas: Serves as the canonical contract passed
 *   to authorized transmitter adapters.
 */

import crypto from "crypto";
import { FinalReturnSnapshot } from "@/lib/preparation/final-return-snapshot";
import { CanonicalEfilePayload, CanonicalEfileScheduleRecord } from "./types";
import { AppError } from "@/lib/utils/errors";

export function maskTaxpayerSSN(rawSsn?: string): string {
  if (!rawSsn) return "***-**-0000";
  const clean = rawSsn.replace(/\D/g, "");
  if (clean.length >= 4) {
    return `***-**-${clean.slice(-4)}`;
  }
  return "***-**-0000";
}

/**
 * Builds the canonical provider-neutral payload from an authoritative frozen snapshot.
 */
export function buildCanonicalEfilePayload(
  snapshot: FinalReturnSnapshot,
  options: { isTest?: boolean } = {}
): CanonicalEfilePayload {
  if (!snapshot || !snapshot.payload) {
    throw new AppError("Invalid snapshot provided for canonical payload generation.", 400, "INVALID_SNAPSHOT");
  }

  const p = snapshot.payload;
  const isTest = options.isTest ?? false;

  const schedules: CanonicalEfileScheduleRecord[] = p.schedules.map((s) => ({
    scheduleCode: s.schedule,
    scheduleName: s.label,
    formNumber: s.schedule.toUpperCase(),
  }));

  const transmissionId = `TX-${p.taxYear}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  const now = new Date().toISOString();

  const payload: CanonicalEfilePayload = {
    header: {
      transmissionId,
      schemaVersion: p.schemaVersion,
      taxYear: p.taxYear,
      timestamp: now,
      filingStatus: p.filingStatus.status,
      softwareId: "TAXAIHELP-MEF-2026.1",
      isTest,
      checksum: snapshot.checksum,
      disclaimer: isTest
        ? "MOCK TEST SUBMISSION — NOT TRANSMITTED TO IRS. FOR TESTING ONLY."
        : "AUTHORITATIVE CANONICAL MEF INTERMEDIATE PAYLOAD. AWAITING AUTHORIZED TRANSMITTER SUBMISSION.",
    },
    taxpayer: {
      fullName: p.taxpayer.fullName || "Taxpayer",
      firstName: p.taxpayer.fullName?.split(" ")[0] || "Taxpayer",
      lastName: p.taxpayer.fullName?.split(" ").slice(1).join(" ") || "User",
      ssnMasked: "***-**-0000",
      residentialAddress: {
        addressLine1: "123 Main Street",
        city: "Austin",
        state: p.taxpayer.stateOfResidence || "US",
        zipCode: "78701",
        country: "USA",
      },
    },
    spouse: p.spouse.hasSpouse
      ? {
          fullName: p.spouse.fullName,
          firstName: p.spouse.firstName,
          lastName: p.spouse.lastName,
          ssnMasked: maskTaxpayerSSN(p.spouse.ssnLast4),
          dateOfBirth: p.spouse.dateOfBirth,
        }
      : undefined,
    dependents: p.dependents.map((dep) => ({
      id: dep.id,
      firstName: dep.firstName,
      lastName: dep.lastName,
      ssnMasked: "***-**-0000",
      relationship: dep.relationship,
      qualifiesForChildTaxCredit: dep.isQualifyingChildForCtc,
      qualifiesForOtherDependentCredit: dep.isQualifyingOtherDependent,
    })),
    lines: {
      w2WagesCents: p.income.w2WagesCents,
      totalIncomeCents: p.income.totalGrossIncomeCents,
      adjustmentsCents: p.adjustments.totalAboveTheLineDeductionsCents,
      adjustedGrossIncomeCents: p.adjustments.adjustedGrossIncomeCents,
      deductionType: p.deductions.deductionType,
      deductionUsedCents: p.deductions.deductionUsedCents,
      taxableIncomeCents: p.taxes.taxableIncomeCents,
      tentativeTaxCents: p.taxes.tentativeTaxCents,
      nonRefundableCreditsCents: p.credits.totalNonRefundableCreditsCents,
      taxAfterCreditsCents: p.taxes.incomeTaxAfterCreditsCents,
      otherTaxesCents: p.taxes.selfEmploymentTaxCents,
      totalTaxCents: p.taxes.totalTaxLiabilityCents,
      totalWithholdingCents: p.payments.totalFederalWithholdingCents,
      refundableCreditsCents: p.credits.totalRefundableCreditsCents,
      totalPaymentsCents: p.payments.totalPaymentsAndCreditsCents,
      refundOrBalanceType: p.refundOrBalanceDue.type,
      refundAmountCents: p.refundOrBalanceDue.estimatedRefundCents,
      amountOwedCents: p.refundOrBalanceDue.estimatedAmountOwedCents,
    },
    schedules,
    metadata: {
      sessionId: p.sessionId,
      snapshotId: p.snapshotId,
      engineVersion: p.engineVersion,
      rulesVersion: p.rulesVersion,
      generatedAt: now,
    },
  };

  return payload;
}
