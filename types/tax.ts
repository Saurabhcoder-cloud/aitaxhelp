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
  deductionType: "standard";
  taxableIncomeCents: number;

  // Tax Liabilities
  federalIncomeTaxCents: number;
  selfEmploymentTaxCents: number;
  totalTaxLiabilityCents: number;

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
}

// Calculation History & Persistence Record
export interface TaxCalculationRecord {
  id: string;
  userId: string;
  calculatorType: CalculatorType;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  title: string;
  inputSnapshot: Record<string, unknown>;
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
  inputSnapshot: Record<string, unknown>;
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

