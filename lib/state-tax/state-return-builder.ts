/**
 * Canonical State Return Builder — Phase 11
 *
 * Constructs the server-authoritative canonical StateReturn document,
 * executing certified statutory calculations and generating SHA-256
 * cryptographic integrity digests.
 *
 * ARCHITECTURAL INVARIANTS:
 * - Server-authoritative: completely ignores client-submitted tax totals.
 * - Deterministic integer-cents arithmetic throughout.
 * - Zero LLM overrides or hallucinations.
 */

import crypto from "crypto";
import { FederalReturn, buildFederalReturn } from "@/lib/preparation/federal-return";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { StateReturn, StateCalculationInput } from "./types";
import { getStateEngine, getStateSupportInfo } from "./registry";
import { mapFederalReturnToStateInput, StateBridgeOptions } from "./federal-bridge";
import { AppError } from "@/lib/utils/errors";

export function computeStateReturnChecksum(stateReturn: StateReturn): string {
  const payloadToHash = {
    returnId: stateReturn.returnId,
    sessionId: stateReturn.sessionId,
    userId: stateReturn.userId,
    stateCode: stateReturn.metadata.stateCode,
    taxYear: stateReturn.metadata.taxYear,
    engineVersion: stateReturn.metadata.engineVersion,
    filingStatus: stateReturn.filingStatus.stateStatus,
    residencyType: stateReturn.taxpayer.residencyType,
    federalAgiCents: stateReturn.income.federalAgiCents,
    totalStateGrossIncomeCents: stateReturn.income.totalStateGrossIncomeCents,
    stateAdjustedGrossIncomeCents: stateReturn.adjustments.stateAdjustedGrossIncomeCents,
    deductionUsedCents: stateReturn.deductions.deductionUsedCents,
    stateTaxableIncomeCents: stateReturn.liability.stateTaxableIncomeCents,
    grossStateTaxCents: stateReturn.liability.grossStateTaxCents,
    netStateTaxCents: stateReturn.liability.netStateTaxCents,
    totalWithholdingCents: stateReturn.payments.totalWithholdingCents,
    totalPaymentsCents: stateReturn.payments.totalPaymentsAndCreditsCents,
    refundOrBalanceType: stateReturn.refundOrBalance.type,
    refundOrBalanceCents: stateReturn.refundOrBalance.amountCents,
  };

  const serialized = JSON.stringify(payloadToHash, Object.keys(payloadToHash).sort());
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

/**
 * Builds the canonical, authoritative StateReturn for a tax preparation session.
 */
export function buildStateReturn(
  session: TaxPreparationSession,
  providedFederalReturn?: FederalReturn,
  options?: StateBridgeOptions
): StateReturn {
  const federalReturn = providedFederalReturn || buildFederalReturn(session);

  if (!session.calculationSnapshot || !federalReturn.metadata.hasCalculation) {
    throw new AppError(
      "State return generation requires a completed federal tax calculation first.",
      422,
      "FEDERAL_RETURN_REQUIRED"
    );
  }

  const stateInput: StateCalculationInput = mapFederalReturnToStateInput(
    session,
    federalReturn,
    options
  );

  if (!stateInput.stateCode) {
    throw new AppError(
      "State of residence is required before generating a state return.",
      422,
      "MISSING_STATE"
    );
  }

  const supportInfo = getStateSupportInfo(stateInput.stateCode);
  if (!supportInfo || supportInfo.supportStatus === "NOT_SUPPORTED") {
    throw new AppError(
      `State tax preparation is not currently supported for ${supportInfo?.stateName || stateInput.stateCode}. TaxAIHelp does not produce unverified state tax calculations.`,
      422,
      "STATE_NOT_SUPPORTED"
    );
  }

  const engine = getStateEngine(stateInput.stateCode);

  const sessionMetadata = {
    returnId: `state-${stateInput.stateCode.toLowerCase()}-${session.id}`,
    sessionId: session.id,
    userId: session.userId,
    taxpayerName: federalReturn.taxpayer.fullName || session.profileSnapshot?.fullName || "Taxpayer",
    spouseName: federalReturn.spouse.fullName,
    hasSpouse: federalReturn.spouse.hasSpouse,
  };

  let stateReturn: StateReturn;
  if (typeof engine.buildReturn === "function") {
    stateReturn = engine.buildReturn(stateInput, sessionMetadata);
  } else {
    throw new AppError(
      `Engine for ${stateInput.stateCode} does not support canonical return building.`,
      500,
      "ENGINE_DEFECT"
    );
  }

  // Calculate cryptographic SHA-256 integrity hash
  const checksum = computeStateReturnChecksum(stateReturn);
  stateReturn.metadata.checksumSha256 = checksum;

  return stateReturn;
}
