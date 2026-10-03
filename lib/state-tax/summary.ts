/**
 * State Tax Summary Generator — Phase 11
 *
 * Deterministically generates a clean, standalone State Tax Situation Summary.
 * Clearly separates state figures from federal tax figures.
 *
 * ARCHITECTURAL INVARIANT:
 * Never invent fake tax numbers for unsupported states.
 * States without statutory engines report NOT_SUPPORTED with zero estimated liability.
 */

import { FederalReturn, buildFederalReturn } from "@/lib/preparation/federal-return";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { TaxYear } from "@/types/tax";
import {
  StateReadinessStatus,
  StateRefundOrBalanceType,
  StateCalculationResult,
} from "./types";
import { getStateSupportInfo, getStateEngine, StateSupportStatus } from "./registry";
import { buildStateBridgeData, StateBridgeOptions } from "./federal-bridge";
import { evaluateStateReadiness } from "./readiness";

export interface StateTaxSummary {
  stateCode: string;
  stateName: string;
  taxYear: TaxYear;
  hasIndividualIncomeTax: boolean;
  supportStatus: StateSupportStatus;
  engineVersion: string;
  filingStatus: string;
  filingStatusLabel: string;
  isReturnRequired: boolean;
  financials: {
    incomeConsideredCents: number;
    stateAgiCents: number;
    deductionUsedCents: number;
    stateTaxableIncomeCents: number;
    grossTaxCents: number;
    totalCreditsCents: number;
    netTaxLiabilityCents: number;
    stateWithholdingCents: number;
    estimatedPaymentsCents?: number;
    totalPaymentsCents: number;
    refundOrBalanceType: StateRefundOrBalanceType;
    refundOrBalanceCents: number;
    breakdown?: {
      additionsCents: number;
      subtractionsCents: number;
      deductionUsedCents: number;
      exemptionsCents: number;
      calEitcCents?: number;
      youngChildCreditCents?: number;
      mentalHealthServicesTaxCents?: number;
    };
  };
  readiness: {
    status: StateReadinessStatus;
    isReady: boolean;
    notice: string;
    blockingErrorsCount: number;
    warningsCount: number;
  };
  disclaimer: string;
  generatedAt: string;
}

export const STATE_TAX_SUMMARY_DISCLAIMER =
  "State tax estimations and determinations are based exclusively on verified statutory state rules. States without certified engines are not calculated to prevent inaccurate state tax returns.";

/**
 * Builds a deterministic State Tax Situation Summary.
 */
export function buildStateTaxSummary(
  session: TaxPreparationSession,
  providedFederalReturn?: FederalReturn,
  options?: StateBridgeOptions
): StateTaxSummary {
  const federalReturn = providedFederalReturn || buildFederalReturn(session);
  const bridge = buildStateBridgeData(session, federalReturn, options);
  const stateCode = bridge.stateCode;
  const supportInfo = getStateSupportInfo(stateCode);
  const readiness = evaluateStateReadiness(session, federalReturn, options);
  const now = new Date().toISOString();

  const stateName = supportInfo?.stateName || stateCode || "Unknown State";
  const hasIncomeTax = supportInfo?.hasIndividualIncomeTax ?? true;
  const supportStatus: StateSupportStatus = supportInfo?.supportStatus || "NOT_SUPPORTED";

  // Case 1: No income tax state (e.g. TX, FL, WA)
  if (supportStatus === "NO_STATE_INCOME_TAX") {
    const engine = getStateEngine(stateCode);
    const calcResult: StateCalculationResult = engine.calculateStateTax(bridge.calculationInput);

    return {
      stateCode,
      stateName,
      taxYear: bridge.taxYear,
      hasIndividualIncomeTax: false,
      supportStatus: "NO_STATE_INCOME_TAX",
      engineVersion: engine.engineVersion,
      filingStatus: bridge.taxpayer.filingStatus,
      filingStatusLabel: bridge.taxpayer.filingStatusLabel,
      isReturnRequired: false,
      financials: {
        incomeConsideredCents: bridge.financials.federalAgiCents,
        stateAgiCents: 0,
        deductionUsedCents: 0,
        stateTaxableIncomeCents: 0,
        grossTaxCents: 0,
        totalCreditsCents: 0,
        netTaxLiabilityCents: 0,
        stateWithholdingCents: calcResult.totalWithholdingCents,
        estimatedPaymentsCents: calcResult.estimatedPaymentsCents || 0,
        totalPaymentsCents: calcResult.totalWithholdingCents + (calcResult.estimatedPaymentsCents || 0),
        refundOrBalanceType: calcResult.refundOrBalanceType,
        refundOrBalanceCents: calcResult.refundOrBalanceCents,
        breakdown: calcResult.breakdown,
      },
      readiness: {
        status: readiness.status,
        isReady: readiness.isReady,
        notice: `${stateName} does not levy personal income taxes. No state return is required.`,
        blockingErrorsCount: 0,
        warningsCount: readiness.warnings.length,
      },
      disclaimer: STATE_TAX_SUMMARY_DISCLAIMER,
      generatedAt: now,
    };
  }

  // Case 2: Supported state with certified engine (e.g. CA)
  if (supportStatus === "SUPPORTED") {
    const engine = getStateEngine(stateCode);
    const calcResult: StateCalculationResult = engine.calculateStateTax(bridge.calculationInput);

    const totalPayments =
      calcResult.totalWithholdingCents +
      (calcResult.estimatedPaymentsCents || 0) +
      calcResult.refundableCreditsCents;

    return {
      stateCode,
      stateName,
      taxYear: bridge.taxYear,
      hasIndividualIncomeTax: true,
      supportStatus: "SUPPORTED",
      engineVersion: engine.engineVersion,
      filingStatus: bridge.taxpayer.filingStatus,
      filingStatusLabel: bridge.taxpayer.filingStatusLabel,
      isReturnRequired: true,
      financials: {
        incomeConsideredCents: bridge.financials.federalAgiCents,
        stateAgiCents: calcResult.stateAgiCents,
        deductionUsedCents: calcResult.breakdown.deductionUsedCents,
        stateTaxableIncomeCents: calcResult.stateTaxableIncomeCents,
        grossTaxCents: calcResult.grossStateTaxCents,
        totalCreditsCents: calcResult.nonRefundableCreditsCents + calcResult.refundableCreditsCents,
        netTaxLiabilityCents: calcResult.netStateTaxCents,
        stateWithholdingCents: calcResult.totalWithholdingCents,
        estimatedPaymentsCents: calcResult.estimatedPaymentsCents || 0,
        totalPaymentsCents: totalPayments,
        refundOrBalanceType: calcResult.refundOrBalanceType,
        refundOrBalanceCents: calcResult.refundOrBalanceCents,
        breakdown: calcResult.breakdown,
      },
      readiness: {
        status: readiness.status,
        isReady: readiness.isReady,
        notice: readiness.notice,
        blockingErrorsCount: readiness.blockingErrors.length,
        warningsCount: readiness.warnings.length,
      },
      disclaimer: STATE_TAX_SUMMARY_DISCLAIMER,
      generatedAt: now,
    };
  }

  // Case 3: Unsupported state (No fake numbers produced)
  return {
    stateCode,
    stateName,
    taxYear: bridge.taxYear,
    hasIndividualIncomeTax: hasIncomeTax,
    supportStatus: "NOT_SUPPORTED",
    engineVersion: "none",
    filingStatus: bridge.taxpayer.filingStatus,
    filingStatusLabel: bridge.taxpayer.filingStatusLabel,
    isReturnRequired: hasIncomeTax,
    financials: {
      incomeConsideredCents: bridge.financials.federalAgiCents,
      stateAgiCents: 0,
      deductionUsedCents: 0,
      stateTaxableIncomeCents: 0,
      grossTaxCents: 0,
      totalCreditsCents: 0,
      netTaxLiabilityCents: 0,
      stateWithholdingCents: bridge.financials.stateWithholdingCents,
      estimatedPaymentsCents: bridge.financials.stateEstimatedPaymentsCents,
      totalPaymentsCents: bridge.financials.stateWithholdingCents + bridge.financials.stateEstimatedPaymentsCents,
      refundOrBalanceType: "not_calculated",
      refundOrBalanceCents: 0,
    },
    readiness: {
      status: "NOT_SUPPORTED",
      isReady: false,
      notice: `State tax preparation is not currently supported for ${stateName}. TaxAIHelp does not produce estimated or unverified state tax calculations.`,
      blockingErrorsCount: readiness.blockingErrors.length,
      warningsCount: readiness.warnings.length,
    },
    disclaimer: STATE_TAX_SUMMARY_DISCLAIMER,
    generatedAt: now,
  };
}
