import {
  TaxCalculationRecord,
  TaxCalculationResult,
  TaxYear,
  TaxFilingStatus,
  CalculatorType,
} from "@/types/tax";
import {
  generateTaxPlanningInsights,
  extractTaxDrivers,
  TaxPlanningInsight,
  TaxDriver,
} from "@/lib/services/tax-insights";
import { formatCurrencyFromCents } from "@/lib/utils/currency";

export type ReportAccessTier = "free" | "paid" | "unlocked";

export interface TaxReportSummary {
  grossIncomeCents: number;
  adjustedGrossIncomeCents: number;
  deductionUsedCents: number;
  taxableIncomeCents: number;
  federalIncomeTaxCents: number;
  selfEmploymentTaxCents: number;
  totalTaxLiabilityCents: number;
  totalPaymentsAndWithholdingCents: number;
  estimatedRefundCents: number;
  estimatedAmountOwedCents: number;
  effectiveTaxRate: number;
  marginalTaxBracket: number;
}

export interface TaxReportIncomeSource {
  label: string;
  amountCents: number;
  description: string;
}

export interface TaxReportIncomeSummary {
  sources: TaxReportIncomeSource[];
  totalGrossIncomeCents: number;
}

export interface TaxReportDeductionSummary {
  deductionType: "standard";
  deductionUsedCents: number;
  deductibleHalfSeTaxCents?: number;
  totalDeductionsCents: number;
  scopeNote: string;
}

export interface TaxReportPaymentSummary {
  federalWithholdingCents: number;
  estimatedPaymentsCents?: number;
  totalPaymentsCents: number;
  estimatedRefundCents: number;
  estimatedAmountOwedCents: number;
  balanceStatusLabel: string;
}

export interface TaxReportSelfEmploymentSummary {
  netSelfEmploymentProfitCents: number;
  taxableSelfEmploymentProfitCents: number;
  socialSecurityTaxCents: number;
  medicareTaxCents: number;
  totalSelfEmploymentTaxCents: number;
  deductibleHalfCents: number;
}

export interface TaxReportQuarterlySummary {
  estimatedAnnualTaxCents: number;
  remainingTaxToPayCents: number;
  quarterlyPaymentCents: number;
  deadlines: Array<{
    quarter: string;
    dueDate: string;
    amountCents: number;
  }>;
  safeHarborGuidance: string;
}

export interface TaxReport {
  id: string;
  calculationId: string;
  userId: string;
  reportVersion: "1.0";
  generatedAt: string;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  calculatorType: CalculatorType;
  engineVersion: string;
  rulesVersion: string;
  title: string;

  // Structured Sections
  taxSummary: TaxReportSummary;
  incomeSummary: TaxReportIncomeSummary;
  deductionSummary: TaxReportDeductionSummary;
  paymentSummary: TaxReportPaymentSummary;
  selfEmploymentSummary?: TaxReportSelfEmploymentSummary;
  quarterlySummary?: TaxReportQuarterlySummary;

  // Educational Drivers & Insights
  taxDrivers: TaxDriver[];
  planningInsights: TaxPlanningInsight[];

  // Top-level liability compatibility
  totalTaxLiabilityCents?: number;

  // Disclaimers & Future Monetization
  limitations: string[];
  disclaimer: string;
  accessTier: ReportAccessTier;
}

/**
 * Builds an immutable, strongly-typed tax summary report from a verified calculation snapshot.
 *
 * NON-NEGOTIABLE ARCHITECTURAL INVARIANTS:
 * 1. Strictly reads fields from the verified calculation snapshot; NEVER recalculates tax numbers.
 * 2. Does not invent non-existent income sources or deductions.
 * 3. Preserves the exact historical engine version, ruleset, tax year, and calculation ID.
 * 4. Prepared for future paid/unlocked tier capabilities without changing the data shape.
 */
export function buildTaxReport(
  calculation: TaxCalculationRecord,
  accessTier: ReportAccessTier = "free"
): TaxReport {
  const res = calculation.resultSnapshot;
  const rawInput = (calculation.inputSnapshot || {}) as Record<string, unknown>;

  // 1. Extract verified income sources actually present in inputSnapshot
  const sources: TaxReportIncomeSource[] = [];

  if (typeof rawInput.w2WagesCents === "number" && rawInput.w2WagesCents > 0) {
    sources.push({
      label: "W-2 Salary & Wages",
      amountCents: rawInput.w2WagesCents,
      description: "Statutory Form W-2 Box 1 wages subject to federal progressive income tax.",
    });
  }

  if (typeof rawInput.gross1099IncomeCents === "number" && rawInput.gross1099IncomeCents > 0) {
    sources.push({
      label: "1099-NEC / Independent Contractor Revenue",
      amountCents: rawInput.gross1099IncomeCents,
      description: "Gross nonemployee compensation reported on Form 1099-NEC.",
    });
  }

  if (typeof rawInput.estimatedAnnualGrossCents === "number" && rawInput.estimatedAnnualGrossCents > 0) {
    sources.push({
      label: "Projected Annual Gross Revenue",
      amountCents: rawInput.estimatedAnnualGrossCents,
      description: "Estimated gross receipts for Form 1040-ES quarterly estimated tax calculations.",
    });
  }

  if (typeof rawInput.otherIncomeCents === "number" && rawInput.otherIncomeCents > 0) {
    sources.push({
      label: "Other Taxable Income",
      amountCents: rawInput.otherIncomeCents,
      description: "Additional ordinary income subject to federal taxation.",
    });
  }

  // Fallback: If raw input had no specific key breakdown, use grossIncomeCents directly
  if (sources.length === 0 && res.grossIncomeCents > 0) {
    sources.push({
      label: "Total Gross Income",
      amountCents: res.grossIncomeCents,
      description: "Aggregate gross income entered in calculation.",
    });
  }

  // 2. Deduction Summary
  const seHalf = res.selfEmploymentDetails?.deductibleHalfCents;
  const totalDeductionsCents = res.deductionUsedCents + (seHalf || 0);

  const deductionSummary: TaxReportDeductionSummary = {
    deductionType: "standard",
    deductionUsedCents: res.deductionUsedCents,
    deductibleHalfSeTaxCents: seHalf,
    totalDeductionsCents,
    scopeNote: "Itemized deductions (Schedule A) are not included in this calculator.",
  };

  // 3. Payment / Withholding Summary
  let balanceStatusLabel = "Fully Balanced ($0.00)";
  if (res.estimatedRefundCents > 0) {
    balanceStatusLabel = `Projected Refund: ${formatCurrencyFromCents(res.estimatedRefundCents)}`;
  } else if (res.estimatedAmountOwedCents > 0) {
    balanceStatusLabel = `Projected Balance Due: ${formatCurrencyFromCents(res.estimatedAmountOwedCents)}`;
  }

  const paymentSummary: TaxReportPaymentSummary = {
    federalWithholdingCents: res.totalPaymentsAndWithholdingCents,
    totalPaymentsCents: res.totalPaymentsAndWithholdingCents,
    estimatedRefundCents: res.estimatedRefundCents,
    estimatedAmountOwedCents: res.estimatedAmountOwedCents,
    balanceStatusLabel,
  };

  // 4. Self-Employment Summary (when applicable)
  let selfEmploymentSummary: TaxReportSelfEmploymentSummary | undefined;
  if (res.selfEmploymentTaxCents > 0 && res.selfEmploymentDetails) {
    const se = res.selfEmploymentDetails;
    selfEmploymentSummary = {
      netSelfEmploymentProfitCents: se.netSelfEmploymentProfitCents,
      taxableSelfEmploymentProfitCents: se.taxableSelfEmploymentProfitCents,
      socialSecurityTaxCents: se.socialSecurityTaxCents,
      medicareTaxCents: se.medicareTaxCents,
      totalSelfEmploymentTaxCents: res.selfEmploymentTaxCents,
      deductibleHalfCents: se.deductibleHalfCents,
    };
  }

  // 5. Quarterly Summary (when applicable)
  let quarterlySummary: TaxReportQuarterlySummary | undefined;
  if (res.quarterlyBreakdown) {
    const qb = res.quarterlyBreakdown;
    quarterlySummary = {
      estimatedAnnualTaxCents: qb.estimatedAnnualTaxCents,
      remainingTaxToPayCents: qb.remainingTaxToPayCents,
      quarterlyPaymentCents: qb.quarterlyPaymentCents,
      deadlines: qb.paymentDeadlines.map((d) => ({
        quarter: d.quarter,
        dueDate: d.dueDate,
        amountCents: d.amountCents,
      })),
      safeHarborGuidance:
        "To avoid IRS underpayment penalties under the safe harbor rule, you generally must pay at least 90% of your current year tax or 100% of your prior year tax (110% if prior AGI exceeded $150,000).",
    };
  }

  // 6. Tax Drivers & Planning Insights (deterministic reuse of Step 7)
  const taxDrivers = extractTaxDrivers(res);
  const planningInsights = generateTaxPlanningInsights(res, calculation.inputSnapshot);

  return {
    id: `report_${calculation.id}`,
    calculationId: calculation.id,
    userId: calculation.userId,
    reportVersion: "1.0",
    generatedAt: new Date().toISOString(),
    taxYear: calculation.taxYear,
    filingStatus: calculation.filingStatus,
    calculatorType: calculation.calculatorType,
    engineVersion: calculation.engineVersion,
    rulesVersion: calculation.rulesVersion,
    title: calculation.title,
    totalTaxLiabilityCents: res.totalTaxLiabilityCents,

    taxSummary: {
      grossIncomeCents: res.grossIncomeCents,
      adjustedGrossIncomeCents: res.adjustedGrossIncomeCents,
      deductionUsedCents: res.deductionUsedCents,
      taxableIncomeCents: res.taxableIncomeCents,
      federalIncomeTaxCents: res.federalIncomeTaxCents,
      selfEmploymentTaxCents: res.selfEmploymentTaxCents,
      totalTaxLiabilityCents: res.totalTaxLiabilityCents,
      totalPaymentsAndWithholdingCents: res.totalPaymentsAndWithholdingCents,
      estimatedRefundCents: res.estimatedRefundCents,
      estimatedAmountOwedCents: res.estimatedAmountOwedCents,
      effectiveTaxRate: res.effectiveTaxRate,
      marginalTaxBracket: res.marginalTaxBracket,
    },

    incomeSummary: {
      sources,
      totalGrossIncomeCents: res.grossIncomeCents,
    },

    deductionSummary,
    paymentSummary,
    selfEmploymentSummary,
    quarterlySummary,

    taxDrivers,
    planningInsights,

    limitations: [
      "State and local income taxes are not modeled in this calculation.",
      "Itemized deductions (Schedule A) are outside the current calculator scope.",
      "Child tax credits, dependent care credits, and clean energy credits are not included.",
      "Retirement contribution deductions (e.g. Traditional 401(k), SEP-IRA) are not computed unless explicitly entered.",
    ],

    disclaimer:
      "This report is an estimate based on the information entered into TaxAIHelp and the tax rules represented by the stated engine/rules version. It is provided for educational purposes and is not a substitute for professional tax advice.",

    accessTier,
  };
}

/**
 * Generates a clean, structured plaintext / markdown report document.
 * This document abstraction decouples report presentation from UI components,
 * enabling future automated PDF generation pipelines without duplicating tax logic.
 */
export function generateTaxReportDocument(report: TaxReport): string {
  const ts = report.taxSummary;
  const filingStatusFormatted = report.filingStatus.replace(/_/g, " ").toUpperCase();
  const dateFormatted = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let doc = `# TaxAIHelp – Tax Summary Report
Report Version: ${report.reportVersion} | Generated: ${dateFormatted}
Calculation Title: ${report.title}
Calculation ID: ${report.calculationId}
Tax Year: ${report.taxYear} | Filing Status: ${filingStatusFormatted}
Engine Version: v${report.engineVersion} | Ruleset: ${report.rulesVersion}

==================================================
1. TAX OVERVIEW
==================================================
- Gross Income:                  ${formatCurrencyFromCents(ts.grossIncomeCents)}
- Adjusted Gross Income (AGI):    ${formatCurrencyFromCents(ts.adjustedGrossIncomeCents)}
- Standard Deduction:             ${formatCurrencyFromCents(ts.deductionUsedCents)}
- Taxable Income:                 ${formatCurrencyFromCents(ts.taxableIncomeCents)}
- Federal Income Tax:             ${formatCurrencyFromCents(ts.federalIncomeTaxCents)}
${ts.selfEmploymentTaxCents > 0 ? `- Self-Employment Tax:           ${formatCurrencyFromCents(ts.selfEmploymentTaxCents)}\n` : ""}- Total Federal Liability:        ${formatCurrencyFromCents(ts.totalTaxLiabilityCents)}
- Total Withholding / Payments:   ${formatCurrencyFromCents(ts.totalPaymentsAndWithholdingCents)}
- Effective Tax Rate:             ${(ts.effectiveTaxRate * 100).toFixed(1)}%
- Top Marginal Bracket:           ${Math.round(ts.marginalTaxBracket * 100)}%
- Net Balance Position:           ${report.paymentSummary.balanceStatusLabel}

==================================================
2. INCOME SOURCES
==================================================
`;

  for (const src of report.incomeSummary.sources) {
    doc += `- ${src.label}: ${formatCurrencyFromCents(src.amountCents)}\n  (${src.description})\n`;
  }

  doc += `\nTotal Gross Income: ${formatCurrencyFromCents(report.incomeSummary.totalGrossIncomeCents)}\n`;

  doc += `
==================================================
3. DEDUCTIONS APPLIED
==================================================
- Statutory Standard Deduction: ${formatCurrencyFromCents(report.deductionSummary.deductionUsedCents)}
`;

  if (report.deductionSummary.deductibleHalfSeTaxCents) {
    doc += `- Deductible Half of SE Tax (Schedule 1): ${formatCurrencyFromCents(report.deductionSummary.deductibleHalfSeTaxCents)}\n`;
  }
  doc += `- Scope Note: ${report.deductionSummary.scopeNote}\n`;

  if (report.selfEmploymentSummary) {
    const se = report.selfEmploymentSummary;
    doc += `
==================================================
4. SCHEDULE SE (SELF-EMPLOYMENT TAX)
==================================================
- Net Self-Employment Profit:     ${formatCurrencyFromCents(se.netSelfEmploymentProfitCents)}
- Taxable SE Profit (92.35%):     ${formatCurrencyFromCents(se.taxableSelfEmploymentProfitCents)}
- Social Security Tax (12.4%):    ${formatCurrencyFromCents(se.socialSecurityTaxCents)}
- Medicare Tax (2.9%):            ${formatCurrencyFromCents(se.medicareTaxCents)}
- Total Self-Employment Tax:      ${formatCurrencyFromCents(se.totalSelfEmploymentTaxCents)}
- Deductible Half (reduces AGI):  ${formatCurrencyFromCents(se.deductibleHalfCents)}
`;
  }

  if (report.quarterlySummary) {
    const qb = report.quarterlySummary;
    doc += `
==================================================
5. FORM 1040-ES QUARTERLY ESTIMATED VOUCHERS
==================================================
- Projected Annual Tax:           ${formatCurrencyFromCents(qb.estimatedAnnualTaxCents)}
- Remaining Tax to Pay:           ${formatCurrencyFromCents(qb.remainingTaxToPayCents)}
- Quarterly Installment:          ${formatCurrencyFromCents(qb.quarterlyPaymentCents)} / quarter

Deadlines:
`;
    for (const d of qb.deadlines) {
      doc += `  * ${d.quarter} (${d.dueDate}): ${formatCurrencyFromCents(d.amountCents)}\n`;
    }
  }

  doc += `
==================================================
6. KEY TAX DRIVERS
==================================================
`;
  for (const driver of report.taxDrivers) {
    doc += `- ${driver.title} (${driver.importance}): ${driver.impactDescription}\n`;
  }

  doc += `
==================================================
7. STATUTORY LIMITATIONS & DISCLAIMER
==================================================
`;
  for (const lim of report.limitations) {
    doc += `- ${lim}\n`;
  }

  doc += `\nNOTICE: ${report.disclaimer}\n`;

  return doc;
}
