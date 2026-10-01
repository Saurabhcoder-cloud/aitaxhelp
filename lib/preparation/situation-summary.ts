import { IncomeDiscovery, activityExpenseCents } from "@/lib/preparation/income";
import { isCompleteIncomeDiscovery } from "@/lib/validations/preparation-income";
import { DocumentsSnapshot } from "@/lib/preparation/documents";
import { DeductionDiscovery, deductionExpenseCents, incomeSupportsBusinessExpenses } from "@/lib/preparation/deductions";
import { isCompleteDeductionDiscovery } from "@/lib/validations/preparation-deductions";
import { PreparationProfileSnapshot, PreparationStep, PreparationStepMap, PREPARATION_STEPS } from "@/lib/preparation/steps";
import { TaxCalculationResult, CalculatorType, TaxWarning } from "@/types/tax";

export interface CalculationReadiness {
  ready: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
}

export interface TaxSituationSummaryCalculation {
  calculationId: string;
  calculatorType: CalculatorType;
  engineVersion: string;
  rulesVersion: string;
  calculatedAt: string;
  totalIncomeCents: number;
  grossIncomeCents: number;
  adjustedGrossIncomeCents: number;
  taxableIncomeCents: number;
  deductionUsedCents: number;
  deductionType: "standard";
  federalIncomeTaxCents: number;
  selfEmploymentTaxCents: number;
  totalTaxLiabilityCents: number;
  totalPaymentsAndWithholdingCents: number;
  estimatedRefundCents: number;
  estimatedAmountOwedCents: number;
  effectiveTaxRate: number;
  marginalTaxBracket: number;
  refundOrBalanceDue: {
    type: "refund" | "balance_due" | "zero";
    amountCents: number;
    estimatedRefundCents: number;
    estimatedAmountOwedCents: number;
  };
  warnings: TaxWarning[];
}

export interface TaxSituationSummary {
  taxYear: number;
  taxpayerName: string | null;
  filingStatus: string;
  whatYouToldUs: {
    incomeSources: string[];
    w2WagesCents: number;
    form1099GrossCents: number;
    gigBusinessGrossCents: number;
    expenseCents: number;
  };
  documentsReceived: string[];
  informationReceived: string[];
  informationStillNeeded: string[];
  warnings: string[];
  progress: {
    currentStep: PreparationStep;
    completedSteps: PreparationStep[];
  };
  calculationStatus: "ready" | "not_ready" | "calculated";
  readiness: CalculationReadiness;

  // Actual calculation results populated once calculation is executed
  calculationId?: string | null;
  calculation?: TaxSituationSummaryCalculation | null;
  totalIncomeCents?: number;
  taxableIncomeCents?: number;
  deductionsCents?: number;
  federalWithholdingCents?: number;
  estimatedFederalTaxCents?: number;
  refundOrBalanceDue?: {
    type: "refund" | "balance_due" | "zero";
    amountCents: number;
    estimatedRefundCents: number;
    estimatedAmountOwedCents: number;
  };
}

export function assessCalculationReadiness(input: {
  profile: PreparationProfileSnapshot;
  steps: PreparationStepMap;
  income: IncomeDiscovery;
  documents: DocumentsSnapshot;
  deductions: DeductionDiscovery;
}): CalculationReadiness {
  const missing: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!input.profile.fullName || input.profile.fullName.trim().length === 0) {
    missing.push("Taxpayer name");
  }
  if (input.steps.taxpayer_profile !== "completed") {
    missing.push("Taxpayer profile");
  }
  if (!isCompleteIncomeDiscovery(input.income)) {
    missing.push("Income sources");
  }

  const deductionCheck = isCompleteDeductionDiscovery(input.deductions, input.income);
  if (!deductionCheck.success) {
    if (input.steps.deductions === "completed") {
      errors.push(deductionCheck.message);
    } else {
      missing.push("Deduction answers");
    }
  }

  for (const document of input.documents.documents) {
    if (document.status === "missing" || document.status === "expected") {
      warnings.push(`${document.displayName} is still needed`);
    }
    if (!document.displayName.trim()) {
      errors.push("A document is missing its name.");
    }
  }

  if (!incomeSupportsBusinessExpenses(input.income) && input.deductions.entries.length > 0) {
    errors.push("Business expenses were entered without freelance, gig, or business income.");
  }

  return {
    ready: missing.length === 0 && errors.length === 0,
    missing,
    warnings,
    errors,
  };
}

export function buildTaxSituationSummary(input: {
  taxYear: number;
  profile: PreparationProfileSnapshot;
  steps: PreparationStepMap;
  currentStep: PreparationStep;
  income: IncomeDiscovery;
  documents: DocumentsSnapshot;
  deductions: DeductionDiscovery;
  calculationSnapshot?: TaxCalculationResult | null;
  calculationId?: string | null;
}): TaxSituationSummary {
  const w2WagesCents = input.income.w2s.reduce((sum, entry) => sum + entry.wagesCents, 0);
  const form1099GrossCents = input.income.form1099s.reduce((sum, entry) => sum + entry.grossIncomeCents, 0);
  const gigBusinessGrossCents = input.income.activities.reduce((sum, entry) => sum + entry.grossReceiptsCents, 0);
  const activityExpenses = input.income.activities.reduce((sum, entry) => sum + activityExpenseCents(entry), 0);
  const expenseCents = input.deductions.saved ? deductionExpenseCents(input.deductions) : activityExpenses;

  const incomeSources = [
    ...input.income.w2s.map((entry) => `W-2 — ${entry.employerName}`),
    ...input.income.form1099s.map((entry) => `Freelance — ${entry.payerName}`),
    ...input.income.activities.map(
      (entry) => `${entry.kind === "gig" ? "Gig" : "Business"} — ${entry.activityName}`
    ),
  ];

  const documentsReceived = input.documents.documents
    .filter((document) => document.status === "received" || document.status === "reviewed")
    .map((document) => document.displayName);

  const readiness = assessCalculationReadiness(input);

  const calc = input.calculationSnapshot;
  let calculationDetails: TaxSituationSummaryCalculation | null = null;
  let calculationStatus: "ready" | "not_ready" | "calculated" = readiness.ready ? "ready" : "not_ready";

  const allWarnings = [...readiness.warnings];

  if (calc) {
    calculationStatus = "calculated";
    const isRefund = calc.estimatedRefundCents > 0;
    const isOwed = calc.estimatedAmountOwedCents > 0;
    const refundOrBalanceDue = {
      type: isRefund ? ("refund" as const) : isOwed ? ("balance_due" as const) : ("zero" as const),
      amountCents: isRefund ? calc.estimatedRefundCents : calc.estimatedAmountOwedCents,
      estimatedRefundCents: calc.estimatedRefundCents,
      estimatedAmountOwedCents: calc.estimatedAmountOwedCents,
    };

    calculationDetails = {
      calculationId: input.calculationId || calc.calculationId,
      calculatorType: calc.calculatorType,
      engineVersion: calc.engineVersion,
      rulesVersion: calc.rulesVersion,
      calculatedAt: calc.calculatedAt,
      totalIncomeCents: calc.grossIncomeCents,
      grossIncomeCents: calc.grossIncomeCents,
      adjustedGrossIncomeCents: calc.adjustedGrossIncomeCents,
      taxableIncomeCents: calc.taxableIncomeCents,
      deductionUsedCents: calc.deductionUsedCents,
      deductionType: calc.deductionType,
      federalIncomeTaxCents: calc.federalIncomeTaxCents,
      selfEmploymentTaxCents: calc.selfEmploymentTaxCents,
      totalTaxLiabilityCents: calc.totalTaxLiabilityCents,
      totalPaymentsAndWithholdingCents: calc.totalPaymentsAndWithholdingCents,
      estimatedRefundCents: calc.estimatedRefundCents,
      estimatedAmountOwedCents: calc.estimatedAmountOwedCents,
      effectiveTaxRate: calc.effectiveTaxRate,
      marginalTaxBracket: calc.marginalTaxBracket,
      refundOrBalanceDue,
      warnings: calc.warnings,
    };

    for (const w of calc.warnings) {
      if (!allWarnings.includes(w.message)) {
        allWarnings.push(w.message);
      }
    }
  }

  const informationReceived = [
    ...(input.profile.fullName ? [`Profile for ${input.profile.fullName}`] : []),
    ...incomeSources,
    ...documentsReceived.map((name) => `${name} recorded as received`),
    ...(input.deductions.saved && input.deductions.hasBusinessExpenses
      ? ["Business expenses entered"]
      : []),
    ...(input.deductions.saved && input.deductions.standardDeductionAcknowledged
      ? ["Standard deduction will be used by the tax engine"]
      : []),
    ...(calc ? ["Deterministic federal tax calculation completed"] : []),
  ];

  return {
    taxYear: input.taxYear,
    taxpayerName: input.profile.fullName,
    filingStatus: input.profile.filingStatus,
    whatYouToldUs: {
      incomeSources,
      w2WagesCents,
      form1099GrossCents,
      gigBusinessGrossCents,
      expenseCents,
    },
    documentsReceived,
    informationReceived,
    informationStillNeeded: readiness.missing,
    warnings: allWarnings,
    progress: {
      currentStep: input.currentStep,
      completedSteps: PREPARATION_STEPS.filter((step) => input.steps[step] === "completed"),
    },
    calculationStatus,
    readiness,
    calculationId: input.calculationId || calc?.calculationId || null,
    calculation: calculationDetails,
    totalIncomeCents: calc?.grossIncomeCents,
    taxableIncomeCents: calc?.taxableIncomeCents,
    deductionsCents: calc?.deductionUsedCents,
    federalWithholdingCents: calc?.totalPaymentsAndWithholdingCents,
    estimatedFederalTaxCents: calc?.totalTaxLiabilityCents,
    refundOrBalanceDue: calculationDetails?.refundOrBalanceDue,
  };
}
