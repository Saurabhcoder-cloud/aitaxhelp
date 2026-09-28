import { IncomeDiscovery, activityExpenseCents } from "@/lib/preparation/income";
import { isCompleteIncomeDiscovery } from "@/lib/validations/preparation-income";
import { DocumentsSnapshot } from "@/lib/preparation/documents";
import { DeductionDiscovery, deductionExpenseCents, incomeSupportsBusinessExpenses } from "@/lib/preparation/deductions";
import { isCompleteDeductionDiscovery } from "@/lib/validations/preparation-deductions";
import { PreparationProfileSnapshot, PreparationStep, PreparationStepMap, PREPARATION_STEPS } from "@/lib/preparation/steps";

export interface CalculationReadiness {
  ready: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
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
  calculationStatus: "ready" | "not_ready";
  readiness: CalculationReadiness;
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
    informationReceived: [
      ...(input.profile.fullName ? [`Profile for ${input.profile.fullName}`] : []),
      ...incomeSources,
      ...documentsReceived.map((name) => `${name} recorded as received`),
      ...(input.deductions.saved && input.deductions.hasBusinessExpenses
        ? ["Business expenses entered"]
        : []),
      ...(input.deductions.saved && input.deductions.standardDeductionAcknowledged
        ? ["Standard deduction will be used by the tax engine"]
        : []),
    ],
    informationStillNeeded: readiness.missing,
    warnings: readiness.warnings,
    progress: {
      currentStep: input.currentStep,
      completedSteps: PREPARATION_STEPS.filter((step) => input.steps[step] === "completed"),
    },
    calculationStatus: readiness.ready ? "ready" : "not_ready",
    readiness,
  };
}
