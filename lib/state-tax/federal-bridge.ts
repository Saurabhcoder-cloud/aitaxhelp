/**
 * Federal -> State Data Bridge — Phase 11
 *
 * Deterministic mapping layer that safely bridges verified FederalReturn data
 * into state-engine inputs without executing state tax calculations.
 *
 * ARCHITECTURAL INVARIANTS:
 * - This bridge NEVER calculates state tax.
 * - Single source of truth: derives exclusively from verified FederalReturn state.
 * - Does not alter, modify, or pollute FederalReturn data.
 */

import { FederalReturn, buildFederalReturn } from "@/lib/preparation/federal-return";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import {
  StateCalculationInput,
  StateResidencyType,
  StateIncomeAllocationRecord,
} from "./types";

export interface StateBridgeOptions {
  residencyType?: StateResidencyType;
  multiStateRecords?: StateIncomeAllocationRecord[];
  stateWithholdingCents?: number;
  stateEstimatedPaymentsCents?: number;
  stateCodeOverride?: string;
  nonresidentIncomeAllocationPercentage?: number;
  priorStateCode?: string;
  moveDate?: string;
  stateAdditionsCents?: number;
  stateSubtractionsCents?: number;
  hasUnder6Child?: boolean;
  customStateInputs?: Record<string, unknown>;
}

export interface StateBridgeData {
  stateCode: string;
  taxYear: FederalReturn["metadata"]["taxYear"];
  federalReturnId: string;
  federalEngineVersion: string;
  federalRulesVersion: string;
  taxpayer: {
    fullName: string;
    stateOfResidence: string;
    filingStatus: FederalReturn["filingStatus"]["status"];
    filingStatusLabel: string;
    residencyType: StateResidencyType;
    priorStateCode?: string;
    moveDate?: string;
  };
  spouse: {
    hasSpouse: boolean;
    fullName?: string;
  };
  dependentsCount: number;
  qualifyingChildrenCount: number;
  financials: {
    grossIncomeCents: number;
    w2WagesCents: number;
    gross1099IncomeCents: number;
    netSelfEmploymentProfitCents: number;
    federalAgiCents: number;
    federalTaxableIncomeCents: number;
    federalDeductionType: "standard" | "itemized";
    federalDeductionUsedCents: number;
    stateAndLocalTaxesPaidCents: number;
    federalTotalWithholdingCents: number;
    stateWithholdingCents: number;
    stateEstimatedPaymentsCents: number;
  };
  calculationInput: StateCalculationInput;
}

/**
 * Maps verified FederalReturn data into a clean, deterministic StateCalculationInput.
 * Does not calculate state tax.
 */
export function mapFederalReturnToStateInput(
  session: TaxPreparationSession,
  providedFederalReturn?: FederalReturn,
  options?: StateBridgeOptions
): StateCalculationInput {
  const federalReturn = providedFederalReturn || buildFederalReturn(session);

  const stateCode = (
    options?.stateCodeOverride ||
    federalReturn.taxpayer.stateOfResidence ||
    session.profileSnapshot?.stateOfResidence ||
    ""
  ).toUpperCase().trim();

  // Extract state and local tax withholding recorded in session
  const saltExpenseCents =
    session.deductionsSnapshot?.guidedAnswers?.stateLocal?.stateLocalTaxCents ||
    session.deductionsSnapshot?.entries
      .filter((e) => e.confirmed && e.category === "state_local_taxes")
      .reduce((sum, e) => sum + e.amountCents, 0) ||
    0;

  const stateWithholdingCents = options?.stateWithholdingCents ?? saltExpenseCents;

  const totalW2Wages =
    federalReturn.income.w2WagesCents + federalReturn.income.spouseW2WagesCents;

  const total1099Gross =
    federalReturn.income.gross1099IncomeCents +
    federalReturn.income.spouseGross1099IncomeCents +
    federalReturn.income.gigBusinessGrossCents;

  const netSeProfit =
    federalReturn.deductions.businessDeductions.netSelfEmploymentProfitCents;

  return {
    stateCode,
    taxYear: federalReturn.metadata.taxYear,
    residencyType: options?.residencyType || "full_year_resident",
    filingStatus: federalReturn.filingStatus.status,
    federalAgiCents: federalReturn.adjustments.adjustedGrossIncomeCents,
    federalTaxableIncomeCents: federalReturn.taxes.taxableIncomeCents,
    w2WagesCents: totalW2Wages,
    gross1099IncomeCents: total1099Gross,
    selfEmploymentProfitCents: netSeProfit,
    qualifyingChildrenCount: federalReturn.credits.qualifyingChildrenCount,
    qualifyingDependentsCount: federalReturn.credits.otherDependentsCount,
    stateWithholdingCents,
    stateEstimatedPaymentsCents: options?.stateEstimatedPaymentsCents || 0,
    nonresidentIncomeAllocationPercentage: options?.nonresidentIncomeAllocationPercentage,
    priorStateCode: options?.priorStateCode,
    moveDate: options?.moveDate,
    stateAdditionsCents: options?.stateAdditionsCents,
    stateSubtractionsCents: options?.stateSubtractionsCents,
    hasUnder6Child: options?.hasUnder6Child,
    multiStateRecords: options?.multiStateRecords,
    customStateInputs: options?.customStateInputs,
  };
}

/**
 * Builds the complete Federal-to-State bridge view model.
 */
export function buildStateBridgeData(
  session: TaxPreparationSession,
  providedFederalReturn?: FederalReturn,
  options?: StateBridgeOptions
): StateBridgeData {
  const federalReturn = providedFederalReturn || buildFederalReturn(session);
  const calculationInput = mapFederalReturnToStateInput(session, federalReturn, options);

  const stateAndLocalTaxesPaidCents =
    federalReturn.deductions.itemizedBreakdown?.allowableSaltCents ||
    session.deductionsSnapshot?.guidedAnswers?.stateLocal?.stateLocalTaxCents ||
    0;

  return {
    stateCode: calculationInput.stateCode,
    taxYear: federalReturn.metadata.taxYear,
    federalReturnId: federalReturn.metadata.returnId,
    federalEngineVersion: federalReturn.metadata.engineVersion,
    federalRulesVersion: federalReturn.metadata.rulesVersion,
    taxpayer: {
      fullName: federalReturn.taxpayer.fullName || session.profileSnapshot?.fullName || "",
      stateOfResidence: calculationInput.stateCode,
      filingStatus: federalReturn.filingStatus.status,
      filingStatusLabel: federalReturn.filingStatus.label,
      residencyType: calculationInput.residencyType,
      priorStateCode: calculationInput.priorStateCode,
      moveDate: calculationInput.moveDate,
    },
    spouse: {
      hasSpouse: federalReturn.spouse.hasSpouse,
      fullName: federalReturn.spouse.fullName,
    },
    dependentsCount: federalReturn.dependents.length,
    qualifyingChildrenCount: federalReturn.credits.qualifyingChildrenCount,
    financials: {
      grossIncomeCents: federalReturn.income.totalGrossIncomeCents,
      w2WagesCents: calculationInput.w2WagesCents,
      gross1099IncomeCents: calculationInput.gross1099IncomeCents,
      netSelfEmploymentProfitCents: calculationInput.selfEmploymentProfitCents,
      federalAgiCents: calculationInput.federalAgiCents,
      federalTaxableIncomeCents: calculationInput.federalTaxableIncomeCents,
      federalDeductionType: federalReturn.deductions.deductionType,
      federalDeductionUsedCents: federalReturn.deductions.deductionUsedCents,
      stateAndLocalTaxesPaidCents,
      federalTotalWithholdingCents: federalReturn.payments.totalFederalWithholdingCents,
      stateWithholdingCents: calculationInput.stateWithholdingCents,
      stateEstimatedPaymentsCents: calculationInput.stateEstimatedPaymentsCents || 0,
    },
    calculationInput,
  };
}
