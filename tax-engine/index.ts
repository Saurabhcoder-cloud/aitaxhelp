import {
  IncomeTaxCalculationInput,
  SelfEmployedCalculationInput,
  QuarterlyTaxCalculationInput,
  TaxCalculationResult,
  TaxWarning,
  TaxYear,
} from "../types/tax";
import { getTaxRules } from "./rules";
import { resolveDeductions } from "./calculations/deductions";
import { calculateProgressiveTax } from "./calculations/income-tax";
import { calculateSelfEmploymentTax } from "./calculations/self-employment";
import { calculateQuarterlySchedule } from "./calculations/quarterly";

export const ENGINE_VERSION = "1.1.0-production-baseline";

function generateCalculationId(): string {
  return "calc_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/**
 * Common baseline warnings applicable to all federal estimations.
 */
function getStandardWarnings(): TaxWarning[] {
  return [
    {
      code: "NO_STATE_TAX",
      level: "info",
      message: "State and local income taxes are not included in this federal estimation.",
    },
    {
      code: "ESTIMATE_ONLY",
      level: "info",
      message: "This calculation is a deterministic estimate based on standard IRS rules and user inputs. It does not constitute official tax filing advice.",
    },
  ];
}

/**
 * Deterministically computes Federal Income Tax (W-2 & General Income).
 */
export function calculateIncomeTax(
  input: IncomeTaxCalculationInput
): TaxCalculationResult {
  const rules = getTaxRules(input.taxYear);
  const warnings = getStandardWarnings();

  const grossIncomeCents = (input.w2WagesCents ?? input.w2IncomeCents ?? 0) + (input.otherIncomeCents ?? 0);
  const withholdingCents = input.federalWithholdingCents ?? input.withholdingCents ?? 0;

  // Deductions: Standard deduction in current baseline
  const deduction = resolveDeductions(
    input.taxYear,
    input.filingStatus,
    input.itemizedDeductionCents ?? 0
  );

  if (deduction.warning) {
    warnings.push(deduction.warning);
  }

  const adjustedGrossIncomeCents = grossIncomeCents;
  const taxableIncomeCents = Math.max(0, adjustedGrossIncomeCents - deduction.deductionUsedCents);

  // Progressive Tax Bracket computation
  const brackets = rules.brackets[input.filingStatus];
  const { federalIncomeTaxCents, marginalRate, breakdown } = calculateProgressiveTax(
    taxableIncomeCents,
    brackets
  );

  const totalTaxLiabilityCents = federalIncomeTaxCents;

  const estimatedRefundCents = Math.max(0, withholdingCents - totalTaxLiabilityCents);
  const estimatedAmountOwedCents = Math.max(0, totalTaxLiabilityCents - withholdingCents);

  const effectiveTaxRate =
    grossIncomeCents > 0
      ? Math.round((totalTaxLiabilityCents / grossIncomeCents) * 10000) / 10000
      : 0;

  return {
    calculationId: generateCalculationId(),
    taxYear: input.taxYear,
    calculatorType: "income_tax",
    filingStatus: input.filingStatus,
    engineVersion: ENGINE_VERSION,
    rulesVersion: rules.version,
    calculatedAt: new Date().toISOString(),

    grossIncomeCents,
    adjustedGrossIncomeCents,
    deductionUsedCents: deduction.deductionUsedCents,
    deductionType: deduction.deductionType,
    taxableIncomeCents,

    federalIncomeTaxCents,
    selfEmploymentTaxCents: 0,
    totalTaxLiabilityCents,

    totalPaymentsAndWithholdingCents: withholdingCents,
    estimatedRefundCents,
    estimatedAmountOwedCents,

    effectiveTaxRate,
    marginalTaxBracket: marginalRate,
    bracketBreakdown: breakdown,

    warnings,

    // Backward-compatible aliases for legacy test suites
    adjustedGrossIncome: grossIncomeCents,
    standardDeduction: deduction.deductionUsedCents,
    taxableIncome: taxableIncomeCents,
    incomeTax: federalIncomeTaxCents,
    selfEmploymentTax: 0,
    aboveTheLineDeduction: 0,
  };
}

/**
 * Deterministically computes Self-Employed & 1099 Federal Taxes.
 * Incorporates Schedule SE and above-the-line deduction for 50% of SE tax.
 */
export function calculateSelfEmployedTax(
  input: SelfEmployedCalculationInput
): TaxCalculationResult {
  const rules = getTaxRules(input.taxYear);
  const warnings = getStandardWarnings();

  const w2WagesCents = input.w2WagesCents ?? 0;
  const withholdingCents = input.federalWithholdingCents ?? 0;

  // 1. Calculate Self-Employment Tax (Schedule SE)
  const seOutput = calculateSelfEmploymentTax(
    input.taxYear,
    input.gross1099IncomeCents,
    input.businessExpensesCents,
    w2WagesCents
  );

  if (input.businessExpensesCents > input.gross1099IncomeCents) {
    warnings.push({
      code: "BUSINESS_LOSS_DETECTED",
      level: "warning",
      message: "Business expenses exceed gross 1099 earnings resulting in a net business loss.",
    });
  }

  // 2. Gross & Adjusted Gross Income
  const grossIncomeCents = w2WagesCents + seOutput.netSelfEmploymentProfitCents;

  // Above-the-line deduction: 50% of self-employment tax reduces AGI
  const adjustedGrossIncomeCents = Math.max(0, grossIncomeCents - seOutput.deductibleHalfCents);

  // 3. Deductions (Standard Deduction for filing status)
  const deduction = resolveDeductions(input.taxYear, input.filingStatus, 0);
  const taxableIncomeCents = Math.max(0, adjustedGrossIncomeCents - deduction.deductionUsedCents);

  // 4. Progressive Federal Income Tax
  const brackets = rules.brackets[input.filingStatus];
  const { federalIncomeTaxCents, marginalRate, breakdown } = calculateProgressiveTax(
    taxableIncomeCents,
    brackets
  );

  // 5. Total Tax Liability = Federal Income Tax + Self Employment Tax
  const totalTaxLiabilityCents = federalIncomeTaxCents + seOutput.totalSelfEmploymentTaxCents;

  const estimatedRefundCents = Math.max(0, withholdingCents - totalTaxLiabilityCents);
  const estimatedAmountOwedCents = Math.max(0, totalTaxLiabilityCents - withholdingCents);

  const effectiveTaxRate =
    grossIncomeCents > 0
      ? Math.round((totalTaxLiabilityCents / grossIncomeCents) * 10000) / 10000
      : 0;

  return {
    calculationId: generateCalculationId(),
    taxYear: input.taxYear,
    calculatorType: "self_employed",
    filingStatus: input.filingStatus,
    engineVersion: ENGINE_VERSION,
    rulesVersion: rules.version,
    calculatedAt: new Date().toISOString(),

    grossIncomeCents,
    adjustedGrossIncomeCents,
    deductionUsedCents: deduction.deductionUsedCents,
    deductionType: deduction.deductionType,
    taxableIncomeCents,

    federalIncomeTaxCents,
    selfEmploymentTaxCents: seOutput.totalSelfEmploymentTaxCents,
    totalTaxLiabilityCents,

    totalPaymentsAndWithholdingCents: withholdingCents,
    estimatedRefundCents,
    estimatedAmountOwedCents,

    effectiveTaxRate,
    marginalTaxBracket: marginalRate,
    bracketBreakdown: breakdown,

    selfEmploymentDetails: {
      netSelfEmploymentProfitCents: seOutput.netSelfEmploymentProfitCents,
      taxableSelfEmploymentProfitCents: seOutput.taxableSelfEmploymentProfitCents,
      socialSecurityTaxCents: seOutput.socialSecurityTaxCents,
      medicareTaxCents: seOutput.medicareTaxCents,
      deductibleHalfCents: seOutput.deductibleHalfCents,
    },

    warnings,

    // Backward-compatible aliases for legacy test suites
    adjustedGrossIncome: adjustedGrossIncomeCents,
    standardDeduction: deduction.deductionUsedCents,
    taxableIncome: taxableIncomeCents,
    incomeTax: federalIncomeTaxCents,
    selfEmploymentTax: seOutput.totalSelfEmploymentTaxCents,
    aboveTheLineDeduction: seOutput.deductibleHalfCents,
  };
}

/**
 * Deterministically computes Quarterly Estimated Tax Payments (Form 1040-ES).
 */
export function calculateQuarterlyTax(
  input: QuarterlyTaxCalculationInput
): TaxCalculationResult {
  // Leverage self-employed calculation for annual baseline liability
  const baseResult = calculateSelfEmployedTax({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    gross1099IncomeCents: input.estimatedAnnualGrossCents,
    businessExpensesCents: input.estimatedAnnualExpensesCents,
    w2WagesCents: input.w2AnnualWagesCents ?? 0,
    federalWithholdingCents: input.w2AnnualWithholdingCents ?? 0,
  });

  const quarterlySchedule = calculateQuarterlySchedule(
    input.taxYear,
    baseResult.totalTaxLiabilityCents,
    baseResult.totalPaymentsAndWithholdingCents
  );

  const warnings = [...baseResult.warnings];

  if (input.priorYearTaxLiabilityCents !== undefined && input.priorYearTaxLiabilityCents > 0) {
    warnings.push({
      code: "SAFE_HARBOR_NOTE",
      level: "info",
      message: "Safe Harbor rules may allow you to avoid underpayment penalties if you pay 100% (or 110% for high earners) of your prior year tax liability.",
    });
  }

  return {
    ...baseResult,
    calculatorType: "quarterly_tax",
    quarterlyBreakdown: {
      estimatedAnnualTaxCents: quarterlySchedule.estimatedAnnualTaxLiabilityCents,
      remainingTaxToPayCents: quarterlySchedule.remainingTaxToPayCents,
      quarterlyPaymentCents: quarterlySchedule.quarterlyPaymentCents,
      paymentDeadlines: quarterlySchedule.vouchers,
    },
    warnings,
  };
}

/**
 * Backward-compatible adapter for tests and legacy callers.
 * Delegates directly to calculateIncomeTax or calculateSelfEmployedTax.
 */
export function calculateFederalTaxes(input: {
  taxYear: TaxYear;
  filingStatus: any;
  wages?: number;
  w2Wages?: number;
  w2WagesCents?: number;
  w2IncomeCents?: number;
  withholdingPaid?: number;
  federalWithholdingCents?: number;
  withholdingCents?: number;
  otherIncomeCents?: number;
  scheduleCNetProfit?: number;
  gross1099IncomeCents?: number;
  businessExpensesCents?: number;
  itemizedDeductionCents?: number;
}): TaxCalculationResult {
  const wagesVal = input.wages ?? input.w2Wages ?? input.w2WagesCents ?? input.w2IncomeCents ?? 0;
  const withholdingVal = input.withholdingPaid ?? input.federalWithholdingCents ?? input.withholdingCents ?? 0;

  if (input.scheduleCNetProfit !== undefined || input.gross1099IncomeCents !== undefined) {
    return calculateSelfEmployedTax({
      taxYear: input.taxYear,
      filingStatus: input.filingStatus,
      gross1099IncomeCents: input.scheduleCNetProfit ?? input.gross1099IncomeCents ?? 0,
      businessExpensesCents: input.businessExpensesCents ?? 0,
      w2WagesCents: wagesVal,
      federalWithholdingCents: withholdingVal,
    });
  }

  return calculateIncomeTax({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    w2WagesCents: wagesVal,
    otherIncomeCents: input.otherIncomeCents ?? 0,
    federalWithholdingCents: withholdingVal,
    itemizedDeductionCents: input.itemizedDeductionCents,
  });
}

export * from "./types";
export * from "./rules";
