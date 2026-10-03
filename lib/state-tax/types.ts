/**
 * State Tax Domain Model — Phase 7
 *
 * Provides a canonical, type-safe representation of state income tax returns,
 * taxpayers, residency types, state adjustments, deductions, credits,
 * liabilities, withholdings, readiness, and metadata.
 *
 * ARCHITECTURAL INVARIANT:
 * This domain model is cleanly separated from FederalReturn.
 * The deterministic tax engine is the sole authority for tax numbers.
 * Zero state tax calculations are performed in UI components or LLMs.
 */

import { TaxFilingStatus, TaxYear } from "@/types/tax";

export type StateResidencyType =
  | "full_year_resident"
  | "part_year_resident"
  | "nonresident";

export type StateReadinessStatus =
  | "READY"
  | "BLOCKED"
  | "NOT_SUPPORTED"
  | "REQUIRES_REVIEW";

export type StateRefundOrBalanceType =
  | "refund"
  | "balance_due"
  | "zero"
  | "not_calculated";

// =============================================================================
// 1. STATE TAXPAYER & FILING STATUS
// =============================================================================

export interface StateTaxpayer {
  fullName: string;
  stateOfResidence: string; // 2-letter US postal code
  residencyType: StateResidencyType;
  residentSince?: string;
  isClaimedAsDependent?: boolean;
}

export interface StateSpouse {
  hasSpouse: boolean;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  stateOfResidence?: string;
  residencyType?: StateResidencyType;
}

export interface StateFilingStatus {
  stateStatus: string; // e.g. "single", "married_filing_jointly", "registered_domestic_partner"
  label: string;
  federalStatus: TaxFilingStatus;
  isConformingWithFederal: boolean;
}

// =============================================================================
// 2. STATE INCOME & MULTI-STATE ALLOCATION
// =============================================================================

export interface StateIncomeAllocationRecord {
  id: string;
  sourceType: "w2" | "1099" | "business" | "other";
  sourceName: string;
  stateCode: string;
  stateWagesCents: number;
  stateWithholdingCents: number;
  allocationPercentage: number; // 0 - 100
}

export interface StateIncome {
  federalAgiCents: number;
  stateW2WagesCents: number;
  state1099GrossCents: number;
  stateBusinessProfitCents: number;
  stateOtherIncomeCents: number;
  totalStateGrossIncomeCents: number;
  allocationPercentage: number; // 100 for full-year resident
  multiStateRecords: StateIncomeAllocationRecord[];
  isMultiStateReturn: boolean;
}

// =============================================================================
// 3. STATE ADJUSTMENTS (Additions & Subtractions to Federal AGI)
// =============================================================================

export interface StateAdjustmentItem {
  code: string;
  description: string;
  amountCents: number;
  direction: "addition" | "subtraction";
}

export interface StateAdjustments {
  totalAdditionsCents: number;
  totalSubtractionsCents: number;
  netAdjustmentsCents: number; // Additions - Subtractions
  items: StateAdjustmentItem[];
  stateAdjustedGrossIncomeCents: number; // Federal AGI + Additions - Subtractions
}

// =============================================================================
// 4. STATE DEDUCTIONS & CREDITS
// =============================================================================

export interface StateDeductions {
  deductionType: "standard" | "itemized" | "none";
  stateStandardDeductionCents: number;
  stateItemizedDeductionCents: number;
  deductionUsedCents: number;
  stateExemptionsCents: number;
  stateTaxableIncomeCents: number; // State AGI - Deductions - Exemptions
}

export interface StateCreditItem {
  id: string;
  name: string;
  code: string;
  amountCents: number;
  isRefundable: boolean;
}

export interface StateCredits {
  nonRefundableCreditsCents: number;
  refundableCreditsCents: number;
  totalCreditsCents: number;
  items: StateCreditItem[];
}

// =============================================================================
// 5. STATE TAX LIABILITY, WITHHOLDING & PAYMENTS
// =============================================================================

export interface StateTaxLiability {
  stateTaxableIncomeCents: number;
  grossStateTaxCents: number;
  netStateTaxCents: number; // Gross tax minus non-refundable credits
  effectiveTaxRate: number;
  marginalTaxBracket: number;
}

export interface StateWithholdingRecord {
  id: string;
  sourceType: "w2" | "1099" | "other";
  payerName: string;
  stateCode: string;
  stateWithholdingCents: number;
  stateWagesCents?: number;
}

export interface StateWithholding {
  w2StateWithholdingCents: number;
  form1099StateWithholdingCents: number;
  totalStateWithholdingCents: number;
  records: StateWithholdingRecord[];
}

export interface StatePayments {
  totalWithholdingCents: number;
  estimatedPaymentsCents: number;
  refundableCreditsCents: number;
  totalPaymentsAndCreditsCents: number;
}

export interface StateRefundOrBalanceDue {
  type: StateRefundOrBalanceType;
  amountCents: number;
  estimatedRefundCents: number;
  estimatedAmountOwedCents: number;
}

// =============================================================================
// 6. STATE READINESS & VALIDATION
// =============================================================================

export type StateValidationCategory =
  | "STATE_SUPPORT"
  | "RESIDENCY_IDENTITY"
  | "FILING_STATUS"
  | "INCOME_ALLOCATION"
  | "WITHHOLDING_PAYMENTS"
  | "CALCULATION_ENGINE"
  | "FEDERAL_PREREQUISITE";

export type StateValidationCode =
  | "STATE_NOT_SUPPORTED"
  | "MISSING_STATE"
  | "MISSING_TAX_YEAR"
  | "STATE_RULES_UNAVAILABLE"
  | "STATE_INCOME_ALLOCATION_REQUIRED"
  | "STATE_WITHHOLDING_REVIEW"
  | "FEDERAL_RETURN_REQUIRED"
  | "STATE_DATA_INCOMPLETE"
  | "CALCULATION_NOT_EXECUTED";

export interface StateValidationError {
  code: StateValidationCode;
  category: StateValidationCategory;
  severity: "BLOCKING" | "WARNING" | "INFO";
  message: string;
  action: string;
  field?: string;
}

export interface StateValidationCheck {
  id: string;
  name: string;
  category: StateValidationCategory;
  passed: boolean;
  details: string;
  error?: StateValidationError;
}

export interface StateReadiness {
  status: StateReadinessStatus;
  isReady: boolean;
  stateCode: string;
  taxYear: TaxYear;
  evaluatedAt: string;
  checks: StateValidationCheck[];
  blockingErrors: StateValidationError[];
  warnings: StateValidationError[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    blockingErrorsCount: number;
    warningsCount: number;
  };
  notice: string;
}

// =============================================================================
// 7. STATE METADATA & TOP-LEVEL STATE RETURN
// =============================================================================

export interface StateTaxMetadata {
  stateCode: string;
  stateName: string;
  taxYear: TaxYear;
  engineVersion: string;
  rulesVersion: string;
  hasIncomeTax: boolean;
  isEngineSupported: boolean;
  federalReturnVersion: string;
  generatedAt: string;
}

export interface StateReturn {
  returnId: string;
  sessionId: string;
  userId: string;
  metadata: StateTaxMetadata;
  taxpayer: StateTaxpayer;
  spouse: StateSpouse;
  filingStatus: StateFilingStatus;
  income: StateIncome;
  adjustments: StateAdjustments;
  deductions: StateDeductions;
  credits: StateCredits;
  liability: StateTaxLiability;
  withholding: StateWithholding;
  payments: StatePayments;
  refundOrBalance: StateRefundOrBalanceDue;
  readiness: StateReadiness;
}

// =============================================================================
// 8. STATE ENGINE INPUT & RESULT CONTRACTS
// =============================================================================

export interface StateCalculationInput {
  stateCode: string;
  taxYear: TaxYear;
  residencyType: StateResidencyType;
  filingStatus: TaxFilingStatus;
  federalAgiCents: number;
  federalTaxableIncomeCents: number;
  w2WagesCents: number;
  gross1099IncomeCents: number;
  selfEmploymentProfitCents: number;
  qualifyingChildrenCount: number;
  qualifyingDependentsCount: number;
  stateWithholdingCents: number;
  multiStateRecords?: StateIncomeAllocationRecord[];
  customStateInputs?: Record<string, unknown>;
}

export interface StateCalculationResult {
  stateCode: string;
  taxYear: TaxYear;
  engineVersion: string;
  rulesVersion: string;
  stateAgiCents: number;
  stateTaxableIncomeCents: number;
  grossStateTaxCents: number;
  nonRefundableCreditsCents: number;
  netStateTaxCents: number;
  refundableCreditsCents: number;
  totalWithholdingCents: number;
  refundOrBalanceCents: number;
  refundOrBalanceType: StateRefundOrBalanceType;
  effectiveTaxRate: number;
  marginalTaxBracket: number;
  breakdown: {
    additionsCents: number;
    subtractionsCents: number;
    deductionUsedCents: number;
    exemptionsCents: number;
  };
}
