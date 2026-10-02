import { TaxFilingStatus, TaxYear } from "@/types/tax";

export const PREPARATION_STEPS = [
  "taxpayer_profile",
  "income",
  "documents",
  "deductions",
  "calculation",
  "review",
] as const;

export type PreparationStep = (typeof PREPARATION_STEPS)[number];

export const PREPARATION_STATUSES = [
  "draft",
  "in_progress",
  "calculation_ready",
  "review",
  "completed",
] as const;

export type PreparationStatus = (typeof PREPARATION_STATUSES)[number];

export type PreparationStepState = "not_started" | "current" | "completed";

export type PreparationStepMap = Record<PreparationStep, PreparationStepState>;

export interface PreparationProfileSnapshot {
  fullName: string | null;
  filingStatus: TaxFilingStatus;
  taxYear: TaxYear;
  hasW2Income: boolean;
  has1099Income: boolean;
  hasBusinessExpenses: boolean;
  stateOfResidence?: string;
  profileReused: boolean;
}

export const PREPARATION_STEP_LABELS: Record<PreparationStep, string> = {
  taxpayer_profile: "Taxpayer profile & household",
  income: "Income",
  documents: "Documents",
  deductions: "Deductions",
  calculation: "Calculation",
  review: "Review",
};

export function emptyStepMap(current: PreparationStep): PreparationStepMap {
  const steps = {} as PreparationStepMap;
  for (const step of PREPARATION_STEPS) {
    steps[step] = step === current ? "current" : "not_started";
  }
  return steps;
}

export function completedStepCount(steps: PreparationStepMap): number {
  return PREPARATION_STEPS.filter((step) => steps[step] === "completed").length;
}

export function nextPreparationStep(step: PreparationStep): PreparationStep | null {
  const index = PREPARATION_STEPS.indexOf(step);
  if (index < 0 || index >= PREPARATION_STEPS.length - 1) {
    return null;
  }
  return PREPARATION_STEPS[index + 1];
}

export function derivePreparationStatus(
  steps: PreparationStepMap,
  currentStep: PreparationStep
): PreparationStatus {
  const allComplete = PREPARATION_STEPS.every((step) => steps[step] === "completed");
  if (allComplete) {
    return "completed";
  }
  if (currentStep === "review") {
    return "review";
  }
  if (
    currentStep === "calculation" &&
    steps.taxpayer_profile === "completed" &&
    steps.income === "completed" &&
    steps.documents === "completed" &&
    steps.deductions === "completed"
  ) {
    return "calculation_ready";
  }
  const anyCompleted = PREPARATION_STEPS.some((step) => steps[step] === "completed");
  if (!anyCompleted && currentStep === "taxpayer_profile") {
    return "draft";
  }
  return "in_progress";
}

export function completeCurrentStep(
  steps: PreparationStepMap,
  currentStep: PreparationStep
): { steps: PreparationStepMap; currentStep: PreparationStep; status: PreparationStatus } {
  const next = nextPreparationStep(currentStep);
  const updated = { ...steps, [currentStep]: "completed" as const };
  if (next) {
    updated[next] = "current";
  }
  const nextCurrent = next ?? currentStep;
  return {
    steps: updated,
    currentStep: nextCurrent,
    status: derivePreparationStatus(updated, nextCurrent),
  };
}
