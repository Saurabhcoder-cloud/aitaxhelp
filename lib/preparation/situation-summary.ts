import { IncomeDiscovery, activityExpenseCents } from "@/lib/preparation/income";
import { isCompleteIncomeDiscovery } from "@/lib/validations/preparation-income";
import { DocumentsSnapshot } from "@/lib/preparation/documents";
import {
  DeductionDiscovery,
  deductionExpenseCents,
  incomeSupportsBusinessExpenses,
  isBusinessDeductionCategory,
  isItemizedDeductionCategory,
  itemizedDeductionTotalCents,
} from "@/lib/preparation/deductions";
import { isCompleteDeductionDiscovery } from "@/lib/validations/preparation-deductions";
import { PreparationProfileSnapshot, PreparationStep, PreparationStepMap, PREPARATION_STEPS } from "@/lib/preparation/steps";
import { TaxCalculationResult, CalculatorType, TaxWarning, TaxCreditsBreakdown, TaxYear } from "@/types/tax";
import { getTaxRules } from "@/tax-engine/rules";
import { HouseholdSnapshot, getHouseholdSummary, HouseholdSummary, FILING_STATUS_LABELS } from "@/lib/preparation/household";

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
  taxBeforeCreditsCents?: number;
  credits?: TaxCreditsBreakdown;
  totalCreditsCents?: number;
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
  householdSummary?: HouseholdSummary;
  creditsSummary?: {
    taxBeforeCreditsCents: number;
    totalCreditsCents: number;
    childTaxCreditCents: number;
    creditForOtherDependentsCents: number;
    additionalChildTaxCreditCents: number;
    earnedIncomeCreditCents: number;
    finalFederalTaxLiabilityCents: number;
  };
  deductionsSummary?: {
    standardDeductionCents: number;
    businessExpensesCents: number;
    discoveredItemizedCents: number;
    deductionTypeUsed: "standard";
    deductionUsedCents: number;
    itemizedCategoriesCount: number;
    unsupportedDeductionsNotice?: string;
  };

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
  household?: HouseholdSnapshot;
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

  // Household & Dependent Validation
  if (input.household) {
    const filingStatus = input.household.filingStatus || input.profile.filingStatus;
    if (filingStatus === "married_filing_jointly" || filingStatus === "married_filing_separately") {
      if (!input.household.spouse?.firstName || !input.household.spouse?.lastName) {
        if (input.steps.taxpayer_profile === "completed") {
          errors.push("Married filing status requires spouse first and last name.");
        } else {
          missing.push("Spouse information");
        }
      }
    }
    if (filingStatus === "head_of_household" && input.household.dependents.length === 0) {
      if (input.steps.taxpayer_profile === "completed") {
        errors.push("Head of Household requires at least one qualifying dependent.");
      } else {
        missing.push("Qualifying dependent for Head of Household");
      }
    }
    if (filingStatus === "qualifying_surviving_spouse") {
      const hasChild = input.household.dependents.some((d) =>
        ["child", "son", "daughter", "stepchild", "foster_child"].includes(d.relationship)
      );
      if (!hasChild) {
        if (input.steps.taxpayer_profile === "completed") {
          errors.push("Qualifying Surviving Spouse status requires at least one qualifying dependent child.");
        } else {
          missing.push("Qualifying dependent child");
        }
      }
    }

    // Check individual dependent validity
    for (const dep of input.household.dependents) {
      if (!dep.firstName?.trim() || !dep.lastName?.trim()) {
        errors.push("A dependent is missing their name.");
      }
      if (!dep.dateOfBirth?.trim()) {
        errors.push("A dependent is missing a valid date of birth.");
      } else {
        const parsed = new Date(dep.dateOfBirth);
        if (isNaN(parsed.getTime()) || parsed > new Date()) {
          errors.push("Dependent date of birth cannot be in the future.");
        }
      }
    }

    // Duplicate dependent check
    const seen = new Set<string>();
    for (const dep of input.household.dependents) {
      const key = `${dep.firstName.toLowerCase()}|${dep.lastName.toLowerCase()}|${dep.dateOfBirth}`;
      if (seen.has(key)) {
        errors.push(`Duplicate dependent detected (${dep.firstName} ${dep.lastName}).`);
      }
      seen.add(key);
    }
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

  const businessEntries = input.deductions.entries.filter((entry) => isBusinessDeductionCategory(entry.category));
  if (!incomeSupportsBusinessExpenses(input.income) && businessEntries.length > 0) {
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
  household?: HouseholdSnapshot;
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

  let creditsSummary: TaxSituationSummary["creditsSummary"] = undefined;

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
      taxBeforeCreditsCents: calc.taxBeforeCreditsCents ?? calc.federalIncomeTaxCents,
      credits: calc.credits,
      totalCreditsCents: calc.totalCreditsCents,
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

    if (calc.credits || calc.totalCreditsCents) {
      const cr = calc.credits || {
        childTaxCreditCents: 0,
        creditForOtherDependentsCents: 0,
        additionalChildTaxCreditCents: 0,
        earnedIncomeCreditCents: 0,
        totalCreditsCents: calc.totalCreditsCents || 0,
        qualifyingChildrenCount: 0,
        otherDependentsCount: 0,
      };
      creditsSummary = {
        taxBeforeCreditsCents: calc.taxBeforeCreditsCents ?? calc.federalIncomeTaxCents,
        totalCreditsCents: calc.totalCreditsCents ?? cr.totalCreditsCents,
        childTaxCreditCents: cr.childTaxCreditCents,
        creditForOtherDependentsCents: cr.creditForOtherDependentsCents,
        additionalChildTaxCreditCents: cr.additionalChildTaxCreditCents,
        earnedIncomeCreditCents: cr.earnedIncomeCreditCents,
        finalFederalTaxLiabilityCents: calc.totalTaxLiabilityCents ?? calc.federalIncomeTaxCents,
      };
    }

    for (const w of calc.warnings) {
      if (!allWarnings.includes(w.message)) {
        allWarnings.push(w.message);
      }
    }
  }

  const effectiveFilingStatus = input.household?.filingStatus || input.profile.filingStatus;
  const householdSummary: HouseholdSummary = input.household
    ? getHouseholdSummary(input.household, input.taxYear)
    : {
        filingStatus: effectiveFilingStatus,
        filingStatusLabel: FILING_STATUS_LABELS[effectiveFilingStatus] || "Single",
        hasSpouse: false,
        spouseName: undefined,
        totalDependents: 0,
        dependentsCount: 0,
        qualifyingChildrenCount: 0,
        otherDependentsCount: 0,
      };

  const rules = getTaxRules(input.taxYear as TaxYear);
  const standardDeductionCents = rules.standardDeductions[effectiveFilingStatus] ?? 15_000_00;
  const discoveredItemizedCents = input.deductions.saved ? itemizedDeductionTotalCents(input.deductions) : 0;
  const deductionsSummary: TaxSituationSummary["deductionsSummary"] = {
    standardDeductionCents,
    businessExpensesCents: expenseCents,
    discoveredItemizedCents,
    deductionTypeUsed: "standard",
    deductionUsedCents: calc?.deductionUsedCents ?? standardDeductionCents,
    itemizedCategoriesCount: input.deductions.entries.filter(
      (e) => e.confirmed && isItemizedDeductionCategory(e.category)
    ).length,
    unsupportedDeductionsNotice:
      discoveredItemizedCents > 0
        ? "Itemized deductions (Schedule A) were discovered, but the official IRS standard deduction was applied by the deterministic engine."
        : undefined,
  };

  const informationReceived = [
    ...(input.profile.fullName ? [`Profile for ${input.profile.fullName}`] : []),
    `Filing status: ${householdSummary.filingStatusLabel}`,
    ...(householdSummary.hasSpouse && householdSummary.spouseName
      ? [`Spouse: ${householdSummary.spouseName}`]
      : []),
    ...(householdSummary.dependentsCount > 0
      ? [
          `${householdSummary.dependentsCount} dependent${
            householdSummary.dependentsCount === 1 ? "" : "s"
          } (${householdSummary.qualifyingChildrenCount} qualifying children for CTC)`,
        ]
      : []),
    ...incomeSources,
    ...documentsReceived.map((name) => `${name} recorded as received`),
    ...(input.deductions.saved && expenseCents > 0
      ? [`Business expenses entered: $${(expenseCents / 100).toLocaleString()}`]
      : input.deductions.saved && input.deductions.hasBusinessExpenses
      ? ["Business expenses entered"]
      : []),
    ...(input.deductions.saved && discoveredItemizedCents > 0
      ? [`Discovered deductions: $${(discoveredItemizedCents / 100).toLocaleString()} (Standard deduction applied)`]
      : []),
    ...(input.deductions.saved && input.deductions.standardDeductionAcknowledged
      ? ["Standard deduction will be used by the tax engine"]
      : []),
    ...(calc ? ["Deterministic federal tax calculation completed"] : []),
    ...(calc?.totalCreditsCents && calc.totalCreditsCents > 0
      ? [`Family credits applied: $${(calc.totalCreditsCents / 100).toLocaleString()}`]
      : []),
  ];

  return {
    taxYear: input.taxYear,
    taxpayerName: input.profile.fullName,
    filingStatus: effectiveFilingStatus,
    householdSummary,
    creditsSummary,
    deductionsSummary,
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
