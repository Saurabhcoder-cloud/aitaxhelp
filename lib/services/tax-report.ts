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
import type { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";

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

export interface TaxReportCalculationDetails {
  calculationId: string;
  totalIncomeCents: number;
  grossIncomeCents: number;
  taxableIncomeCents: number;
  federalIncomeTaxCents: number;
  totalTaxLiabilityCents: number;
  estimatedRefundCents: number;
  estimatedAmountOwedCents: number;
}

export interface TaxReport {
  id: string;
  calculationId: string;
  userId: string;
  taxpayerName?: string;
  calculation?: TaxReportCalculationDetails;
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

  const taxpayerName =
    typeof rawInput.taxpayerName === "string" && rawInput.taxpayerName.trim()
      ? rawInput.taxpayerName.trim()
      : undefined;

  return {
    id: `report_${calculation.id}`,
    calculationId: calculation.id,
    userId: calculation.userId,
    taxpayerName,
    calculation: {
      calculationId: calculation.id,
      totalIncomeCents: res.grossIncomeCents,
      grossIncomeCents: res.grossIncomeCents,
      taxableIncomeCents: res.taxableIncomeCents,
      federalIncomeTaxCents: res.federalIncomeTaxCents,
      totalTaxLiabilityCents: res.totalTaxLiabilityCents,
      estimatedRefundCents: res.estimatedRefundCents,
      estimatedAmountOwedCents: res.estimatedAmountOwedCents,
    },
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

  let doc = `# Tax Preparation & Filing Summary Report
TaxAIHelp – Tax Summary Report
Report Version: ${report.reportVersion} | Generated: ${dateFormatted}
${report.taxpayerName ? `Taxpayer: ${report.taxpayerName}\n` : ""}Calculation Title: ${report.title}
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

/**
 * Builds a verified tax summary report directly from an active preparation session
 * that has executed a deterministic calculation.
 */
export function buildTaxReportFromPreparationSession(
  session: TaxPreparationSession,
  accessTier: ReportAccessTier = "free"
): TaxReport {
  if (!session.calculationSnapshot) {
    throw new Error("Cannot generate tax report: preparation session has not run a calculation.");
  }
  const calc = session.calculationSnapshot;
  const taxpayerName =
    session.profileSnapshot.fullName ||
    session.situationSummary.taxpayerName ||
    undefined;

  const rawInput: Record<string, unknown> = {
    taxpayerName,
    w2WagesCents: session.situationSummary.whatYouToldUs.w2WagesCents,
    gross1099IncomeCents:
      session.situationSummary.whatYouToldUs.form1099GrossCents +
      session.situationSummary.whatYouToldUs.gigBusinessGrossCents,
    businessExpensesCents: session.situationSummary.whatYouToldUs.expenseCents,
    federalWithholdingCents: calc.totalPaymentsAndWithholdingCents,
  };

  const calculationId = session.calculationId || session.id;
  const pseudoRecord: TaxCalculationRecord = {
    id: calculationId,
    userId: session.userId,
    calculatorType: calc.calculatorType,
    taxYear: session.taxYear,
    filingStatus: session.profileSnapshot.filingStatus,
    title: session.title,
    inputSnapshot: rawInput,
    resultSnapshot: {
      ...calc,
      calculationId,
    },
    engineVersion: calc.engineVersion,
    rulesVersion: calc.rulesVersion,
    createdAt: calc.calculatedAt || session.updatedAt,
    updatedAt: session.updatedAt,
  };

  return buildTaxReport(pseudoRecord, accessTier);
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates a clean, standalone, printable HTML document for a TaxReport.
 */
export function generateTaxReportHtml(report: TaxReport): string {
  const ts = report.taxSummary;
  const filingStatusFormatted = report.filingStatus.replace(/_/g, " ").toUpperCase();
  const dateFormatted = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${report.title} - TaxAIHelp Tax Summary Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; color: #0f172a; }
    .header .meta { font-size: 13px; color: #64748b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
    .banner { padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .banner.refund { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
    .banner.owed { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .banner h2 { margin: 0; font-size: 22px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #f8fafc; }
    .card h3 { margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .card .val { font-size: 20px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #334155; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h1>${report.title}</h1>
      <span class="badge">CALCULATED RESULT — Deterministic Tax Engine v${report.engineVersion}</span>
    </div>
    <div class="meta">
      ${report.taxpayerName ? `Taxpayer: <strong>${escapeHtml(report.taxpayerName)}</strong> | ` : ""}Tax Year: <strong>${report.taxYear}</strong> | Filing Status: <strong>${filingStatusFormatted}</strong> | Generated: <strong>${dateFormatted}</strong>
    </div>
  </div>

  <div class="banner ${ts.estimatedRefundCents > 0 ? "refund" : ts.estimatedAmountOwedCents > 0 ? "owed" : ""}">
    <h2>${report.paymentSummary.balanceStatusLabel}</h2>
    <div style="font-size:13px; margin-top:4px;">
      Total Federal Tax Liability: <strong>${formatCurrencyFromCents(ts.totalTaxLiabilityCents)}</strong> | 
      Total Payments / Withholdings: <strong>${formatCurrencyFromCents(ts.totalPaymentsAndWithholdingCents)}</strong>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Total Gross Income</h3>
      <div class="val">${formatCurrencyFromCents(ts.grossIncomeCents)}</div>
      <div style="font-size:12px; color:#64748b; margin-top:4px;">Adjusted Gross Income: ${formatCurrencyFromCents(ts.adjustedGrossIncomeCents)}</div>
    </div>
    <div class="card">
      <h3>Deductions Used</h3>
      <div class="val">${formatCurrencyFromCents(ts.deductionUsedCents)}</div>
      <div style="font-size:12px; color:#64748b; margin-top:4px;">Standard Deduction (${filingStatusFormatted})</div>
    </div>
    <div class="card">
      <h3>Taxable Income</h3>
      <div class="val">${formatCurrencyFromCents(ts.taxableIncomeCents)}</div>
      <div style="font-size:12px; color:#64748b; margin-top:4px;">Subject to progressive IRS brackets</div>
    </div>
    <div class="card">
      <h3>Effective Tax Rate</h3>
      <div class="val">${(ts.effectiveTaxRate * 100).toFixed(1)}%</div>
      <div style="font-size:12px; color:#64748b; margin-top:4px;">Marginal Bracket: ${Math.round(ts.marginalTaxBracket * 100)}%</div>
    </div>
  </div>

  <h3 style="font-size:16px; margin-bottom:8px;">Income Breakdown</h3>
  <table>
    <thead><tr><th>Source</th><th>Amount</th><th>Description</th></tr></thead>
    <tbody>
      ${report.incomeSummary.sources.map(s => `<tr><td>${s.label}</td><td><strong>${formatCurrencyFromCents(s.amountCents)}</strong></td><td>${s.description}</td></tr>`).join("")}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>Disclaimer:</strong> ${report.disclaimer}</p>
    <p style="margin-top:4px;">Calculation ID: ${report.calculationId} | Ruleset: ${report.rulesVersion} | Generated by TaxAIHelp</p>
  </div>
</body>
</html>`;
}

