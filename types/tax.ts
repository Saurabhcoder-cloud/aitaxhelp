/**
 * Core Tax Domain Types
 * Governs all tax calculation engine inputs, rules, and outputs.
 */

export type TaxFilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household"
  | "qualifying_surviving_spouse";

export type TaxYear = 2026 | 2025 | 2024 | 2023;

export type CalculatorType =
  | "income_tax"
  | "self_employed"
  | "1099"
  | "quarterly_tax";

export interface TaxBracket {
  rate: number; // e.g. 0.10 for 10%
  minCents: number;
  maxCents: number | null; // null represents the unbounded upper bracket
}

export interface TaxBracketBreakdownItem {
  rate: number;
  bracketRange: string;
  taxableAmountInBracketCents: number;
  taxInBracketCents: number;
}

export interface TaxWarning {
  code: string;
  level: "info" | "warning" | "unsupported";
  message: string;
}

export interface DependentInput {
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  relationship: string;
  monthsLivedWithTaxpayer?: number;
  isFullTimeStudent?: boolean;
  isPermanentlyDisabled?: boolean;
  providedMoreThanHalfOwnSupport?: boolean;
  providedMoreThanHalfSupport?: boolean;
  claimedByOtherTaxpayer?: boolean;
  isQualifyingChild?: boolean;
  ssnLast4?: string;
}

export interface SpouseInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  ssnLast4?: string;
  hasIncome?: boolean;
  hasW2Income?: boolean;
  w2WagesCents?: number;
  spouseW2WagesCents?: number;
  federalWithholdingCents?: number;
  hasSelfEmploymentIncome?: boolean;
  gross1099IncomeCents?: number;
  spouse1099GrossCents?: number;
  spouseGross1099IncomeCents?: number;
  businessExpensesCents?: number;
  spouseBusinessExpensesCents?: number;
}

export interface ScheduleAInput {
  medicalExpensesCents?: number;
  stateAndLocalIncomeTaxesCents?: number;
  stateAndLocalSalesTaxesCents?: number;
  realEstatePropertyTaxesCents?: number;
  personalPropertyTaxesCents?: number;
  saltTaxesCents?: number;
  mortgageInterestCents?: number;
  charitableCashCents?: number;
  charitableNonCashCents?: number;
}

export interface ScheduleABreakdown {
  medicalExpensesCents: number;
  medicalAgiThresholdCents: number;
  allowableMedicalCents: number;
  saltTotalClaimedCents: number;
  saltCapCents: number;
  allowableSaltCents: number;
  allowableMortgageInterestCents: number;
  allowableCharitableCents: number;
  totalScheduleACents: number;
}

export interface TaxCreditsBreakdown {
  childTaxCreditCents: number; // Non-refundable CTC
  creditForOtherDependentsCents: number; // Non-refundable ODC
  childAndDependentCareCreditCents?: number; // Non-refundable CDCTC (IRC § 21)
  totalNonRefundableCreditsCents: number;
  taxAfterNonRefundableCreditsCents: number;
  additionalChildTaxCreditCents: number; // Refundable ACTC
  earnedIncomeCreditCents: number; // Refundable EITC
  totalRefundableCreditsCents: number;
  totalCreditsCents: number;
  qualifyingChildrenCount: number;
  otherDependentsCount: number;
  qualifyingCarePersonsCount?: number;
}

// Income Tax Calculator Input (Standard W-2 & Federal)
export interface IncomeTaxCalculationInput {
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  w2WagesCents?: number;
  w2IncomeCents?: number;
  otherIncomeCents?: number;
  federalWithholdingCents?: number;
  withholdingCents?: number;
  itemizedDeductionCents?: number;
  dependents?: DependentInput[];
  spouse?: SpouseInput;
  investmentIncomeCents?: number;
  // Phase 3 Extensions
  studentLoanInterestCents?: number;
  childCareExpensesCents?: number;
  qualifyingCarePersonsCount?: number;
  scheduleA?: ScheduleAInput;
  isTaxpayerDependent?: boolean;
}

// Self-Employed / 1099 Tax Calculation Input
export interface SelfEmployedCalculationInput {
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  gross1099IncomeCents: number;
  businessExpensesCents: number;
  w2WagesCents?: number;
  federalWithholdingCents?: number;
  hasOtherSelfEmploymentIncome?: boolean;
  dependents?: DependentInput[];
  spouse?: SpouseInput;
  investmentIncomeCents?: number;
  spouseW2WagesCents?: number;
  spouseGross1099IncomeCents?: number;
  spouseBusinessExpensesCents?: number;
  // Phase 3 Extensions
  businessMiles?: number;
  spouseBusinessMiles?: number;
  studentLoanInterestCents?: number;
  childCareExpensesCents?: number;
  qualifyingCarePersonsCount?: number;
  scheduleA?: ScheduleAInput;
  isTaxpayerDependent?: boolean;
}

// Quarterly Estimated Tax Calculation Input
export interface QuarterlyTaxCalculationInput {
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  estimatedAnnualGrossCents: number;
  estimatedAnnualExpensesCents: number;
  w2AnnualWagesCents?: number;
  w2AnnualWithholdingCents?: number;
  priorYearTaxLiabilityCents?: number;
}

// Unified Result Output from Deterministic Engine
export interface TaxCalculationResult {
  calculationId: string;
  taxYear: TaxYear;
  calculatorType: CalculatorType;
  filingStatus: TaxFilingStatus;
  engineVersion: string;
  rulesVersion: string;
  calculatedAt: string;

  // Breakdown in Integer Cents
  grossIncomeCents: number;
  adjustedGrossIncomeCents: number;
  deductionUsedCents: number;
  deductionType: "standard" | "itemized";
  taxableIncomeCents: number;

  // Schedule A Itemized Breakdown if evaluated
  itemizedBreakdown?: ScheduleABreakdown;

  // Above-the-Line Deductions Breakdown
  aboveTheLineDeductions?: {
    studentLoanInterestCents: number;
    deductibleHalfSeTaxCents: number;
    totalAboveTheLineCents: number;
  };

  // Standard Mileage Details if applicable
  mileageDetails?: {
    businessMiles: number;
    ratePerMileCents: number;
    mileageDeductionCents: number;
  };

  // Tax Liabilities
  federalIncomeTaxCents: number;
  selfEmploymentTaxCents: number;
  totalTaxLiabilityCents: number;

  // Credits & Phase 1 Family Extension
  taxBeforeCreditsCents?: number;
  credits?: TaxCreditsBreakdown;
  totalCreditsCents?: number;

  // Withholding & Net Position
  totalPaymentsAndWithholdingCents: number;
  estimatedRefundCents: number;
  estimatedAmountOwedCents: number;

  // Rates & Metrics
  effectiveTaxRate: number; // e.g. 0.145 for 14.5%
  marginalTaxBracket: number; // e.g. 0.22 for 22%

  // Detailed Brackets
  bracketBreakdown: TaxBracketBreakdownItem[];

  // Self-Employment specific metrics if applicable
  selfEmploymentDetails?: {
    netSelfEmploymentProfitCents: number;
    taxableSelfEmploymentProfitCents: number;
    socialSecurityTaxCents: number;
    medicareTaxCents: number;
    deductibleHalfCents: number;
  };

  // Quarterly specific breakdown if applicable
  quarterlyBreakdown?: {
    estimatedAnnualTaxCents: number;
    remainingTaxToPayCents: number;
    quarterlyPaymentCents: number;
    paymentDeadlines: Array<{
      quarter: string;
      dueDate: string;
      amountCents: number;
    }>;
  };

  // Structured System Warnings & Guardrails
  warnings: TaxWarning[];

  // Backward-compatible aliases for legacy test suites
  adjustedGrossIncome?: number;
  standardDeduction?: number;
  taxableIncome?: number;
  incomeTax?: number;
  selfEmploymentTax?: number;
  aboveTheLineDeduction?: number;
  totalIncomeCents?: number;
  netProfitCents?: number;
}

// Calculation Input Snapshot Union & Normalizer
export type TaxCalculationInputSnapshot =
  | Record<string, unknown>
  | IncomeTaxCalculationInput
  | SelfEmployedCalculationInput;

export function normalizeInputSnapshot(
  snapshot: TaxCalculationInputSnapshot | undefined
): Record<string, unknown> {
  if (!snapshot || typeof snapshot !== "object") return {};
  const record: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(snapshot)) {
    record[key] = val;
  }
  return record;
}

// Calculation History & Persistence Record
export interface TaxCalculationRecord {
  id: string;
  userId: string;
  calculatorType: CalculatorType;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  title: string;
  inputSnapshot: TaxCalculationInputSnapshot;
  resultSnapshot: TaxCalculationResult;
  engineVersion: string;
  rulesVersion: string;
  createdAt: string;
  updatedAt: string;
}

// Request payload to save a calculation
export interface SaveCalculationRequest {
  calculatorType: CalculatorType;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  title?: string;
  inputSnapshot: TaxCalculationInputSnapshot;
  resultSnapshot: TaxCalculationResult;
}

// Compact summary for calculation history lists
export interface CalculationHistorySummary {
  id: string;
  calculatorType: CalculatorType;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  title: string;
  engineVersion: string;
  rulesVersion: string;
  createdAt: string;
  totalTaxLiabilityCents: number;
  effectiveTaxRate: number;
  estimatedRefundCents: number;
  estimatedAmountOwedCents: number;
}

