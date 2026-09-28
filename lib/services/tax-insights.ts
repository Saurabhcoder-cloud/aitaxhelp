import { TaxCalculationResult, TaxCalculationRecord } from "@/types/tax";
import { formatCurrencyFromCents } from "@/lib/utils/currency";

export type InsightCategory =
  | "income"
  | "deductions"
  | "self_employment"
  | "withholding"
  | "estimated_payments"
  | "tax_brackets"
  | "scenario_comparison"
  | "planning_consideration";

export type InsightLevel = "info" | "positive" | "caution";

export interface TaxPlanningInsight {
  id: string;
  category: InsightCategory;
  level: InsightLevel;
  title: string;
  explanation: string;
  supportingField?: string;
  numericValueCents?: number;
  formattedValue?: string;
  disclaimer?: string;
}

export interface TaxDriver {
  id: string;
  title: string;
  impactDescription: string;
  amountCents?: number;
  percentage?: number;
  importance: "primary" | "secondary";
}

export interface ScenarioComparisonMetric {
  key: string;
  label: string;
  valueACents?: number;
  valueBCents?: number;
  valueAFormatted: string;
  valueBFormatted: string;
  deltaCents?: number;
  deltaFormatted: string;
  deltaType: "positive" | "negative" | "neutral";
}

export interface ScenarioComparisonResult {
  calculationA: {
    id: string;
    title: string;
    taxYear: number;
    filingStatus: string;
    calculatorType: string;
  };
  calculationB: {
    id: string;
    title: string;
    taxYear: number;
    filingStatus: string;
    calculatorType: string;
  };
  metrics: ScenarioComparisonMetric[];
  insights: TaxPlanningInsight[];
  incomeDifferenceCents?: number;
  taxLiabilityDifferenceCents?: number;
  comparedAt: string;
}

/**
 * Generates structured, deterministic planning insights from verified calculation outputs.
 *
 * NON-NEGOTIABLE ARCHITECTURAL INVARIANTS:
 * 1. Every numeric value is sourced strictly from verified calculation fields.
 * 2. No AI hallucinations: insights are rule-governed and educational only.
 * 3. Never claims guaranteed savings, tax reductions, or CPA advice.
 * 4. Clearly identifies unsupported situations and statutory boundaries.
 */
export function generateTaxPlanningInsights(
  result: TaxCalculationResult,
  _inputs?: Record<string, unknown>
): TaxPlanningInsight[] {
  const insights: TaxPlanningInsight[] = [];

  // 1. Marginal Rate vs. Effective Rate Educational Insight
  const marginalPercent = Math.round(result.marginalTaxBracket * 100);
  const effectivePercent = (result.effectiveTaxRate * 100).toFixed(1);

  insights.push({
    id: "insight_effective_vs_marginal",
    category: "tax_brackets",
    level: "info",
    title: `Effective Rate (${effectivePercent}%) vs. Top Marginal Bracket (${marginalPercent}%)`,
    explanation:
      `Your top dollar is taxed at ${marginalPercent}%, but your overall federal effective rate is only ${effectivePercent}%. ` +
      `Because the US uses progressive statutory tax brackets, your earlier dollars are taxed at lower rates (10%, 12%, etc.) before reaching your top bracket.`,
    supportingField: "effectiveTaxRate",
    formattedValue: `${effectivePercent}% effective`,
  });

  // 2. Standard Deduction Impact
  if (result.deductionUsedCents > 0) {
    const formattedDeduction = formatCurrencyFromCents(result.deductionUsedCents);
    insights.push({
      id: "insight_standard_deduction",
      category: "deductions",
      level: "positive",
      title: `Standard Deduction Protected ${formattedDeduction} of Income`,
      explanation:
        `Under IRS statutory rules for Tax Year ${result.taxYear}, your filing status (${result.filingStatus.replace(/_/g, " ")}) ` +
        `provides a standard deduction of ${formattedDeduction}, which is completely subtracted from gross income before progressive tax brackets apply.`,
      supportingField: "deductionUsedCents",
      numericValueCents: result.deductionUsedCents,
      formattedValue: formattedDeduction,
    });
  }

  // 3. Withholding & Balance Due / Refund Insights
  if (result.totalPaymentsAndWithholdingCents > 0 || result.calculatorType === "income_tax") {
    if (result.estimatedRefundCents > 0) {
      const formattedRefund = formatCurrencyFromCents(result.estimatedRefundCents);
      insights.push({
        id: "insight_withholding_refund",
        category: "withholding",
        level: "positive",
        title: `Projected Refund: ${formattedRefund}`,
        explanation:
          `Your federal withholding (${formatCurrencyFromCents(result.totalPaymentsAndWithholdingCents)}) ` +
          `exceeds your calculated federal tax liability (${formatCurrencyFromCents(result.totalTaxLiabilityCents)}). ` +
          `While receiving a refund is reassuring, over-withholding means you provided an interest-free loan to the government. ` +
          `You may consider reviewing your Form W-4 with your employer if you wish to increase your regular take-home pay.`,
        supportingField: "estimatedRefundCents",
        numericValueCents: result.estimatedRefundCents,
        formattedValue: formattedRefund,
      });
    } else if (result.estimatedAmountOwedCents > 0) {
      const formattedDue = formatCurrencyFromCents(result.estimatedAmountOwedCents);
      insights.push({
        id: "insight_withholding_due",
        category: "withholding",
        level: "caution",
        title: `Projected Amount Due: ${formattedDue}`,
        explanation:
          `Your calculated federal tax liability (${formatCurrencyFromCents(result.totalTaxLiabilityCents)}) ` +
          `exceeds your entered withholding payments (${formatCurrencyFromCents(result.totalPaymentsAndWithholdingCents)}). ` +
          `You should plan for this estimated balance due when filing your federal tax return.`,
        supportingField: "estimatedAmountOwedCents",
        numericValueCents: result.estimatedAmountOwedCents,
        formattedValue: formattedDue,
      });
    } else {
      insights.push({
        id: "insight_withholding_balanced",
        category: "withholding",
        level: "info",
        title: "Federal Tax Position is Fully Balanced",
        explanation:
          "Your entered withholding payments match your calculated federal liability. You are projected to have neither a substantial refund nor an unexpected balance due.",
        supportingField: "totalPaymentsAndWithholdingCents",
        numericValueCents: result.totalPaymentsAndWithholdingCents,
        formattedValue: "$0.00 balance",
      });
    }
  }

  // 4. Self-Employment Tax & Schedule SE Deductibility
  if (result.selfEmploymentTaxCents > 0 && result.selfEmploymentDetails) {
    const se = result.selfEmploymentDetails;
    const formattedSe = formatCurrencyFromCents(result.selfEmploymentTaxCents);
    const formattedDeductibleHalf = formatCurrencyFromCents(se.deductibleHalfCents);

    insights.push({
      id: "insight_self_employment_breakdown",
      category: "self_employment",
      level: "info",
      title: `Schedule SE Tax: ${formattedSe}`,
      explanation:
        `Self-employment tax represents Social Security (${formatCurrencyFromCents(se.socialSecurityTaxCents)} at 12.4%) ` +
        `and Medicare (${formatCurrencyFromCents(se.medicareTaxCents)} at 2.9%) on 92.35% of your net self-employment profit. ` +
        `Importantly, 50% of this amount (${formattedDeductibleHalf}) is deductible as an above-the-line adjustment to income on Form 1040 Schedule 1, ` +
        `reducing your ordinary taxable income.`,
      supportingField: "selfEmploymentTaxCents",
      numericValueCents: result.selfEmploymentTaxCents,
      formattedValue: formattedSe,
    });
  }

  // 5. Quarterly Estimated Payment Insights (Form 1040-ES)
  if (result.quarterlyBreakdown) {
    const qb = result.quarterlyBreakdown;
    const formattedPayment = formatCurrencyFromCents(qb.quarterlyPaymentCents);

    insights.push({
      id: "insight_quarterly_schedule",
      category: "estimated_payments",
      level: "info",
      title: `Quarterly Installment: ${formattedPayment} / quarter`,
      explanation:
        `To satisfy federal estimated tax requirements and avoid IRS underpayment penalties, ` +
        `your projected annual liability is divided across 4 statutory payment deadlines. ` +
        `Paying at least 90% of your current year liability (or 100% of prior year tax) satisfies IRS safe harbor guidelines.`,
      supportingField: "quarterlyPaymentCents",
      numericValueCents: qb.quarterlyPaymentCents,
      formattedValue: formattedPayment,
    });
  }

  // 6. Educational Planning Considerations & Statutory Scope Limitations
  insights.push({
    id: "insight_planning_considerations",
    category: "planning_consideration",
    level: "info",
    title: "Educational Planning Considerations & Limitations",
    explanation:
      `This deterministic calculation models federal ordinary income and Schedule SE taxes. ` +
      `It does not account for state or local taxes, itemized deductions (Schedule A), child or dependent credits, ` +
      `or retirement contribution deductions (such as Traditional 401(k) or SEP-IRA). ` +
      `For comprehensive tax filing or tax optimization, consider consulting a licensed CPA or Enrolled Agent.`,
    disclaimer: "Educational estimate only. Does not constitute formal CPA or legal tax advice.",
  });

  return insights;
}

/**
 * Extracts the primary mathematical drivers of this calculation result.
 */
export function extractTaxDrivers(result: TaxCalculationResult): TaxDriver[] {
  const drivers: TaxDriver[] = [];

  // Driver 1: Taxable Ordinary Income
  if (result.taxableIncomeCents > 0) {
    drivers.push({
      id: "driver_taxable_income",
      title: "Taxable Ordinary Income",
      impactDescription: `Taxable ordinary income of ${formatCurrencyFromCents(result.taxableIncomeCents)} after standard deduction.`,
      amountCents: result.taxableIncomeCents,
      importance: "primary",
    });
  }

  // Driver 2: Top Marginal Bracket
  drivers.push({
    id: "driver_marginal_bracket",
    title: "Top Marginal Rate Bracket",
    impactDescription: `Income spans brackets up to the ${Math.round(result.marginalTaxBracket * 100)}% statutory rate.`,
    percentage: result.marginalTaxBracket,
    importance: "primary",
  });

  // Driver 3: Self-Employment Tax (if applicable)
  if (result.selfEmploymentTaxCents > 0) {
    drivers.push({
      id: "driver_se_tax",
      title: "Self-Employment Tax (Schedule SE)",
      impactDescription: `Added ${formatCurrencyFromCents(result.selfEmploymentTaxCents)} in Social Security and Medicare taxes.`,
      amountCents: result.selfEmploymentTaxCents,
      importance: "primary",
    });
  }

  // Driver 4: Standard Deduction Shield
  if (result.deductionUsedCents > 0) {
    drivers.push({
      id: "driver_standard_deduction",
      title: "Standard Deduction Shield",
      impactDescription: `Shielded ${formatCurrencyFromCents(result.deductionUsedCents)} from federal taxation.`,
      amountCents: result.deductionUsedCents,
      importance: "secondary",
    });
  }

  // Driver 5: Withholding Credit
  if (result.totalPaymentsAndWithholdingCents > 0) {
    drivers.push({
      id: "driver_withholding",
      title: "Federal Withholding / Payments",
      impactDescription: `Offset federal liability by ${formatCurrencyFromCents(result.totalPaymentsAndWithholdingCents)}.`,
      amountCents: result.totalPaymentsAndWithholdingCents,
      importance: "secondary",
    });
  }

  return drivers;
}

/**
 * Compares two saved calculations owned by the authenticated user and calculates
 * exact, verified mathematical deltas.
 */
export function compareSavedCalculations(
  calcA: TaxCalculationRecord,
  calcB: TaxCalculationRecord
): ScenarioComparisonResult {
  const resA = calcA.resultSnapshot;
  const resB = calcB.resultSnapshot;

  const createDeltaMetric = (
    key: string,
    label: string,
    centsA: number,
    centsB: number,
    higherIsFavorable: boolean = false
  ): ScenarioComparisonMetric => {
    const diff = centsB - centsA;
    const formattedDiff =
      diff > 0
        ? `+${formatCurrencyFromCents(diff)}`
        : diff < 0
        ? `-${formatCurrencyFromCents(Math.abs(diff))}`
        : "$0.00";

    let deltaType: "positive" | "negative" | "neutral" = "neutral";
    if (diff !== 0) {
      if (higherIsFavorable) {
        deltaType = diff > 0 ? "positive" : "negative";
      } else {
        deltaType = diff > 0 ? "negative" : "positive";
      }
    }

    return {
      key,
      label,
      valueACents: centsA,
      valueBCents: centsB,
      valueAFormatted: formatCurrencyFromCents(centsA),
      valueBFormatted: formatCurrencyFromCents(centsB),
      deltaCents: diff,
      deltaFormatted: formattedDiff,
      deltaType,
    };
  };

  const metrics: ScenarioComparisonMetric[] = [
    createDeltaMetric("grossIncome", "Gross Income", resA.grossIncomeCents, resB.grossIncomeCents, true),
    createDeltaMetric("deductionUsed", "Standard Deduction", resA.deductionUsedCents, resB.deductionUsedCents, true),
    createDeltaMetric("taxableIncome", "Taxable Income", resA.taxableIncomeCents, resB.taxableIncomeCents, false),
    createDeltaMetric("federalIncomeTax", "Federal Income Tax", resA.federalIncomeTaxCents, resB.federalIncomeTaxCents, false),
    createDeltaMetric("selfEmploymentTax", "Self-Employment Tax", resA.selfEmploymentTaxCents, resB.selfEmploymentTaxCents, false),
    createDeltaMetric("totalLiability", "Total Federal Liability", resA.totalTaxLiabilityCents, resB.totalTaxLiabilityCents, false),
    createDeltaMetric("withholding", "Total Payments / Withheld", resA.totalPaymentsAndWithholdingCents, resB.totalPaymentsAndWithholdingCents, true),
  ];

  // Rates Comparison
  const rateDiff = (resB.effectiveTaxRate - resA.effectiveTaxRate) * 100;
  metrics.push({
    key: "effectiveRate",
    label: "Effective Tax Rate",
    valueAFormatted: `${(resA.effectiveTaxRate * 100).toFixed(1)}%`,
    valueBFormatted: `${(resB.effectiveTaxRate * 100).toFixed(1)}%`,
    deltaFormatted: rateDiff > 0 ? `+${rateDiff.toFixed(1)}%` : `${rateDiff.toFixed(1)}%`,
    deltaType: rateDiff > 0 ? "negative" : rateDiff < 0 ? "positive" : "neutral",
  });

  // Net Position (Refund or Amount Due)
  const netPositionA = resA.estimatedRefundCents - resA.estimatedAmountOwedCents;
  const netPositionB = resB.estimatedRefundCents - resB.estimatedAmountOwedCents;
  const netDiff = netPositionB - netPositionA;
  metrics.push({
    key: "netPosition",
    label: "Net Position (Refund - Due)",
    valueACents: netPositionA,
    valueBCents: netPositionB,
    valueAFormatted:
      netPositionA >= 0
        ? `Refund: ${formatCurrencyFromCents(netPositionA)}`
        : `Due: ${formatCurrencyFromCents(Math.abs(netPositionA))}`,
    valueBFormatted:
      netPositionB >= 0
        ? `Refund: ${formatCurrencyFromCents(netPositionB)}`
        : `Due: ${formatCurrencyFromCents(Math.abs(netPositionB))}`,
    deltaCents: netDiff,
    deltaFormatted:
      netDiff > 0
        ? `+${formatCurrencyFromCents(netDiff)}`
        : netDiff < 0
        ? `-${formatCurrencyFromCents(Math.abs(netDiff))}`
        : "$0.00",
    deltaType: netDiff > 0 ? "positive" : netDiff < 0 ? "negative" : "neutral",
  });

  // Comparison Insights
  const insights: TaxPlanningInsight[] = [];

  const liabilityDiff = resB.totalTaxLiabilityCents - resA.totalTaxLiabilityCents;
  insights.push({
    id: "insight_comparison_liability",
    category: "scenario_comparison",
    level: liabilityDiff > 0 ? "caution" : liabilityDiff < 0 ? "positive" : "info",
    title: `Liability Variance: ${
      liabilityDiff > 0
        ? `+${formatCurrencyFromCents(liabilityDiff)}`
        : liabilityDiff < 0
        ? `-${formatCurrencyFromCents(Math.abs(liabilityDiff))}`
        : "Equal ($0.00 variance)"
    }`,
    explanation:
      `Scenario B ("${calcB.title}") calculates a total federal tax liability of ${formatCurrencyFromCents(resB.totalTaxLiabilityCents)}, ` +
      `compared to ${formatCurrencyFromCents(resA.totalTaxLiabilityCents)} in Scenario A ("${calcA.title}"). ` +
      `This difference reflects variances in gross income, statutory deductions (${calcA.taxYear} vs ${calcB.taxYear}), and applicable tax rate brackets.`,
    supportingField: "totalTaxLiabilityCents",
    numericValueCents: liabilityDiff,
  });

  if (calcA.taxYear !== calcB.taxYear) {
    insights.push({
      id: "insight_comparison_tax_year",
      category: "scenario_comparison",
      level: "info",
      title: `Tax Year Transition: ${calcA.taxYear} → ${calcB.taxYear}`,
      explanation:
        `This comparison bridges statutory IRS inflation adjustments between Tax Year ${calcA.taxYear} and Tax Year ${calcB.taxYear}, ` +
        `including standard deduction threshold updates and progressive bracket adjustments.`,
    });
  }

  if (calcA.filingStatus !== calcB.filingStatus) {
    insights.push({
      id: "insight_comparison_filing_status",
      category: "scenario_comparison",
      level: "info",
      title: `Filing Status Transition: ${calcA.filingStatus.replace(/_/g, " ")} vs ${calcB.filingStatus.replace(/_/g, " ")}`,
      explanation:
        `The calculations reflect different IRS filing status schedules. Filing statuses govern statutory standard deductions, bracket thresholds, and phase-out limits.`,
    });
  }

  return {
    calculationA: {
      id: calcA.id,
      title: calcA.title,
      taxYear: calcA.taxYear,
      filingStatus: calcA.filingStatus,
      calculatorType: calcA.calculatorType,
    },
    calculationB: {
      id: calcB.id,
      title: calcB.title,
      taxYear: calcB.taxYear,
      filingStatus: calcB.filingStatus,
      calculatorType: calcB.calculatorType,
    },
    metrics,
    insights,
    incomeDifferenceCents: Math.abs(resB.grossIncomeCents - resA.grossIncomeCents),
    taxLiabilityDifferenceCents: Math.abs(resB.totalTaxLiabilityCents - resA.totalTaxLiabilityCents),
    comparedAt: new Date().toISOString(),
  };
}
