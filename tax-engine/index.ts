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
import { calculateCredits } from "./calculations/credits";
import { calculateMileageDeduction } from "./calculations/mileage";
import { calculateStudentLoanInterestDeduction } from "./calculations/student-loan-interest";
import { calculateItemizedDeductions } from "./calculations/itemized-deductions";

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
  if (
    ((input as any).gross1099IncomeCents && (input as any).gross1099IncomeCents > 0) ||
    ((input as any).businessMiles && (input as any).businessMiles > 0) ||
    ((input as any).businessExpensesCents && (input as any).businessExpensesCents > 0)
  ) {
    return calculateSelfEmployedTax(input as unknown as SelfEmployedCalculationInput);
  }

  const rules = getTaxRules(input.taxYear);
  const warnings = getStandardWarnings();

  const spouseW2Cents = input.spouse?.spouseW2WagesCents ?? input.spouse?.w2WagesCents ?? 0;
  const primaryW2Cents = (input.w2WagesCents ?? input.w2IncomeCents ?? 0);
  const grossIncomeCents = primaryW2Cents + spouseW2Cents + (input.otherIncomeCents ?? 0);
  const withholdingCents = input.federalWithholdingCents ?? input.withholdingCents ?? 0;

  // Above-the-line deduction: Student Loan Interest (IRC § 221)
  let studentLoanInterestDeductionCents = 0;
  if (input.studentLoanInterestCents && input.studentLoanInterestCents > 0) {
    const sliResult = calculateStudentLoanInterestDeduction({
      taxYear: input.taxYear,
      filingStatus: input.filingStatus,
      interestPaidCents: input.studentLoanInterestCents,
      magiCents: grossIncomeCents,
      isTaxpayerDependent: input.isTaxpayerDependent,
    });
    studentLoanInterestDeductionCents = sliResult.deductionCents;
    if (sliResult.isDisallowed && sliResult.disallowedReason) {
      warnings.push({
        code: "STUDENT_LOAN_INTEREST_DISALLOWED",
        level: "info",
        message: sliResult.disallowedReason,
      });
    }
  }

  const totalAboveTheLineCents = studentLoanInterestDeductionCents;
  const adjustedGrossIncomeCents = Math.max(0, grossIncomeCents - totalAboveTheLineCents);

  // Deductions: Resolves Standard vs Schedule A Itemized
  const deduction = resolveDeductions(
    input.taxYear,
    input.filingStatus,
    input.itemizedDeductionCents ?? 0,
    input.scheduleA,
    adjustedGrossIncomeCents
  );

  if (deduction.warning) {
    warnings.push(deduction.warning);
  }

  const taxableIncomeCents = Math.max(0, adjustedGrossIncomeCents - deduction.deductionUsedCents);

  // Progressive Tax Bracket computation
  const brackets = rules.brackets[input.filingStatus];
  const { federalIncomeTaxCents, marginalRate, breakdown } = calculateProgressiveTax(
    taxableIncomeCents,
    brackets
  );

  const taxBeforeCreditsCents = federalIncomeTaxCents;

  // Deterministic Credits Computation (CTC, ODC, CDCTC, ACTC, EITC)
  const earnedIncomeCents = grossIncomeCents;
  const creditsOutput = calculateCredits(
    input.taxYear,
    input.filingStatus,
    adjustedGrossIncomeCents,
    earnedIncomeCents,
    taxBeforeCreditsCents,
    input.dependents ?? [],
    {
      investmentIncomeCents: input.investmentIncomeCents,
      childCareExpensesCents: input.childCareExpensesCents,
      qualifyingCarePersonsCount: input.qualifyingCarePersonsCount,
      spouseEarnedIncomeCents: spouseW2Cents,
    }
  );

  const totalTaxLiabilityCents = creditsOutput.taxAfterNonRefundableCreditsCents;

  const totalPaymentsAndCreditsCents = withholdingCents + creditsOutput.totalRefundableCreditsCents;
  const estimatedRefundCents = Math.max(0, totalPaymentsAndCreditsCents - totalTaxLiabilityCents);
  const estimatedAmountOwedCents = Math.max(0, totalTaxLiabilityCents - totalPaymentsAndCreditsCents);

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

    itemizedBreakdown: deduction.itemizedBreakdown,
    aboveTheLineDeductions: {
      studentLoanInterestCents: studentLoanInterestDeductionCents,
      deductibleHalfSeTaxCents: 0,
      totalAboveTheLineCents,
    },

    federalIncomeTaxCents,
    selfEmploymentTaxCents: 0,
    totalTaxLiabilityCents,

    // Family Tax Credits Extension
    taxBeforeCreditsCents,
    credits: creditsOutput,
    totalCreditsCents: creditsOutput.totalCreditsCents,

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
    aboveTheLineDeduction: totalAboveTheLineCents,
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

  const w2WagesCents =
    input.w2WagesCents ?? (input as { w2IncomeCents?: number }).w2IncomeCents ?? 0;
  const withholdingCents = input.federalWithholdingCents ?? 0;

  const spouseW2WagesCents =
    input.spouseW2WagesCents ??
    input.spouse?.spouseW2WagesCents ??
    input.spouse?.w2WagesCents ??
    0;
  const spouse1099GrossCents =
    input.spouseGross1099IncomeCents ??
    input.spouse?.spouseGross1099IncomeCents ??
    input.spouse?.spouse1099GrossCents ??
    input.spouse?.gross1099IncomeCents ??
    0;
  const spouseExpensesCents =
    input.spouseBusinessExpensesCents ??
    input.spouse?.spouseBusinessExpensesCents ??
    input.spouse?.businessExpensesCents ??
    0;

  // 0. Business Mileage Deduction (Schedule C Line 9)
  let mileageDetails:
    | { businessMiles: number; ratePerMileCents: number; mileageDeductionCents: number }
    | undefined;
  let primaryMileageDeductionCents = 0;
  if (input.businessMiles && input.businessMiles > 0) {
    const mRes = calculateMileageDeduction(input.taxYear, input.businessMiles);
    primaryMileageDeductionCents = mRes.deductionCents;
    mileageDetails = {
      businessMiles: mRes.businessMiles,
      ratePerMileCents: mRes.ratePerMileCents,
      mileageDeductionCents: mRes.deductionCents,
    };
  }

  let spouseMileageDeductionCents = 0;
  if (input.spouseBusinessMiles && input.spouseBusinessMiles > 0) {
    const smRes = calculateMileageDeduction(input.taxYear, input.spouseBusinessMiles);
    spouseMileageDeductionCents = smRes.deductionCents;
  }

  const effectivePrimaryExpensesCents = (input.businessExpensesCents ?? 0) + primaryMileageDeductionCents;
  const effectiveSpouseExpensesCents = (spouseExpensesCents ?? 0) + spouseMileageDeductionCents;

  // 1. Calculate Self-Employment Tax (Schedule SE) for Primary Taxpayer
  const seOutput = calculateSelfEmploymentTax(
    input.taxYear,
    input.gross1099IncomeCents,
    effectivePrimaryExpensesCents,
    w2WagesCents
  );

  // Calculate Spouse Self-Employment Tax independently if spouse has 1099 receipts
  let spouseSeTaxCents = 0;
  let spouseDeductibleHalfCents = 0;
  let spouseNetProfitCents = 0;

  if (spouse1099GrossCents > 0) {
    const spouseSeOutput = calculateSelfEmploymentTax(
      input.taxYear,
      spouse1099GrossCents,
      effectiveSpouseExpensesCents,
      spouseW2WagesCents
    );
    spouseSeTaxCents = spouseSeOutput.totalSelfEmploymentTaxCents;
    spouseDeductibleHalfCents = spouseSeOutput.deductibleHalfCents;
    spouseNetProfitCents = spouseSeOutput.netSelfEmploymentProfitCents;
  }

  const totalSelfEmploymentTaxCents = seOutput.totalSelfEmploymentTaxCents + spouseSeTaxCents;
  const totalDeductibleHalfCents = seOutput.deductibleHalfCents + spouseDeductibleHalfCents;

  if (effectivePrimaryExpensesCents > input.gross1099IncomeCents) {
    warnings.push({
      code: "BUSINESS_LOSS_DETECTED",
      level: "warning",
      message: "Business expenses exceed gross 1099 earnings resulting in a net business loss.",
    });
  }

  // 2. Gross & Adjusted Gross Income
  const grossIncomeCents =
    w2WagesCents + spouseW2WagesCents + seOutput.netSelfEmploymentProfitCents + spouseNetProfitCents;

  // Above-the-line deduction: 50% of self-employment tax + Student Loan Interest
  let studentLoanInterestDeductionCents = 0;
  const magiBeforeSli = Math.max(0, grossIncomeCents - totalDeductibleHalfCents);
  if (input.studentLoanInterestCents && input.studentLoanInterestCents > 0) {
    const sliResult = calculateStudentLoanInterestDeduction({
      taxYear: input.taxYear,
      filingStatus: input.filingStatus,
      interestPaidCents: input.studentLoanInterestCents,
      magiCents: magiBeforeSli,
      isTaxpayerDependent: input.isTaxpayerDependent,
    });
    studentLoanInterestDeductionCents = sliResult.deductionCents;
    if (sliResult.isDisallowed && sliResult.disallowedReason) {
      warnings.push({
        code: "STUDENT_LOAN_INTEREST_DISALLOWED",
        level: "info",
        message: sliResult.disallowedReason,
      });
    }
  }

  const totalAboveTheLineDeduction = totalDeductibleHalfCents + studentLoanInterestDeductionCents;
  const adjustedGrossIncomeCents = Math.max(0, grossIncomeCents - totalAboveTheLineDeduction);

  // 3. Deductions (Resolves Standard vs Schedule A Itemized)
  const deduction = resolveDeductions(
    input.taxYear,
    input.filingStatus,
    0,
    input.scheduleA,
    adjustedGrossIncomeCents
  );
  if (deduction.warning) {
    warnings.push(deduction.warning);
  }
  const taxableIncomeCents = Math.max(0, adjustedGrossIncomeCents - deduction.deductionUsedCents);

  // 4. Progressive Federal Income Tax
  const brackets = rules.brackets[input.filingStatus];
  const { federalIncomeTaxCents, marginalRate, breakdown } = calculateProgressiveTax(
    taxableIncomeCents,
    brackets
  );

  const taxBeforeCreditsCents = federalIncomeTaxCents;

  // 5. Deterministic Credits Computation (CTC, ODC, CDCTC, ACTC, EITC)
  const earnedIncomeCents =
    w2WagesCents + spouseW2WagesCents + seOutput.netSelfEmploymentProfitCents + spouseNetProfitCents;
  const spouseEarnedCents = spouseW2WagesCents + spouseNetProfitCents;
  const creditsOutput = calculateCredits(
    input.taxYear,
    input.filingStatus,
    adjustedGrossIncomeCents,
    earnedIncomeCents,
    taxBeforeCreditsCents,
    input.dependents ?? [],
    {
      investmentIncomeCents: input.investmentIncomeCents,
      childCareExpensesCents: input.childCareExpensesCents,
      qualifyingCarePersonsCount: input.qualifyingCarePersonsCount,
      spouseEarnedIncomeCents: spouseEarnedCents,
    }
  );

  // Total Tax Liability = Federal Income Tax after non-refundable credits + Self Employment Tax
  const totalTaxLiabilityCents =
    creditsOutput.taxAfterNonRefundableCreditsCents + totalSelfEmploymentTaxCents;

  const totalPaymentsAndCreditsCents = withholdingCents + creditsOutput.totalRefundableCreditsCents;
  const estimatedRefundCents = Math.max(0, totalPaymentsAndCreditsCents - totalTaxLiabilityCents);
  const estimatedAmountOwedCents = Math.max(0, totalTaxLiabilityCents - totalPaymentsAndCreditsCents);

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

    itemizedBreakdown: deduction.itemizedBreakdown,
    aboveTheLineDeductions: {
      studentLoanInterestCents: studentLoanInterestDeductionCents,
      deductibleHalfSeTaxCents: totalDeductibleHalfCents,
      totalAboveTheLineCents: totalAboveTheLineDeduction,
    },
    mileageDetails,

    federalIncomeTaxCents,
    selfEmploymentTaxCents: totalSelfEmploymentTaxCents,
    totalTaxLiabilityCents,

    // Family Tax Credits Extension
    taxBeforeCreditsCents,
    credits: creditsOutput,
    totalCreditsCents: creditsOutput.totalCreditsCents,

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
    netProfitCents: seOutput.netSelfEmploymentProfitCents,

    warnings,

    // Backward-compatible aliases for legacy test suites
    adjustedGrossIncome: adjustedGrossIncomeCents,
    standardDeduction: deduction.deductionUsedCents,
    taxableIncome: taxableIncomeCents,
    incomeTax: federalIncomeTaxCents,
    selfEmploymentTax: seOutput.totalSelfEmploymentTaxCents,
    aboveTheLineDeduction: totalAboveTheLineDeduction,
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
export * from "./calculations/mileage";
export * from "./calculations/student-loan-interest";
export * from "./calculations/itemized-deductions";
export * from "./calculations/credits";
export * from "./calculations/deductions";
export * from "./calculations/income-tax";
export * from "./calculations/self-employment";
export * from "./calculations/quarterly";
