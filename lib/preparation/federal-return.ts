import {
  TaxFilingStatus,
  TaxYear,
  TaxCalculationResult,
  ScheduleABreakdown,
} from "@/types/tax";
import { TaxPreparationSession } from "@/lib/services/tax-preparation-session-store";
import { PreparationStep } from "@/lib/preparation/steps";
import {
  DEPENDENT_RELATIONSHIP_LABELS,
  HouseholdSnapshot,
} from "@/lib/preparation/household";
import {
  isQualifyingChildForCtc,
  isQualifyingOtherDependent,
  isQualifyingPersonForCdctc,
  calculateAgeAtTaxYearEnd,
} from "@/tax-engine/calculations/credits";
import { isBusinessDeductionCategory } from "@/lib/preparation/deductions";
import { getTaxYearRules } from "@/tax-engine/rules";

// =============================================================================
// 1. READINESS TYPES & STATUSES
// =============================================================================

export type FederalReturnReadinessStatus =
  | "complete"
  | "incomplete"
  | "warning"
  | "not_applicable"
  | "requires_review";

export const READINESS_STATUSES = {
  COMPLETE: "complete",
  INCOMPLETE: "incomplete",
  WARNING: "warning",
  NOT_APPLICABLE: "not_applicable",
  REQUIRES_REVIEW: "requires_review",
} as const;

export type FederalReturnCategoryKey =
  | "taxpayer_info"
  | "filing_status"
  | "household"
  | "dependents"
  | "income"
  | "deductions"
  | "credits"
  | "payments"
  | "calculation"
  | "review";

export interface FederalReturnCategoryReadiness {
  category: FederalReturnCategoryKey;
  title: string;
  status: FederalReturnReadinessStatus;
  missingItems: string[];
  warnings: string[];
  blockingItems: string[];
  actionStep?: PreparationStep;
  actionLabel?: string;
}

export interface FederalReturnReadiness {
  isReadyForReview: boolean;
  overallStatus: FederalReturnReadinessStatus;
  categories: Record<FederalReturnCategoryKey, FederalReturnCategoryReadiness>;
  summaryBlockingItems: string[];
  summaryWarnings: string[];
  completedCategoriesCount: number;
  totalCategoriesCount: number;
}

// =============================================================================
// 2. RECONCILIATION TYPES
// =============================================================================

export interface ReconciliationCheck {
  id: string;
  label: string;
  passed: boolean;
  expectedCents: number;
  actualCents: number;
  differenceCents: number;
  description: string;
}

export interface FederalReturnReconciliation {
  isReconciled: boolean;
  checks: ReconciliationCheck[];
  mismatches: string[];
}

// =============================================================================
// 3. RETURN DOMAIN SUB-MODELS
// =============================================================================

export interface FederalReturnTaxpayer {
  id: string;
  fullName: string | null;
  stateOfResidence?: string;
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  filingStatusLabel: string;
  isClaimedAsDependent?: boolean;
}

export interface FederalReturnSpouse {
  hasSpouse: boolean;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  ssnLast4?: string;
  hasW2Income?: boolean;
  w2WagesCents?: number;
  hasSelfEmploymentIncome?: boolean;
  gross1099IncomeCents?: number;
  businessExpensesCents?: number;
  federalWithholdingCents?: number;
}

export interface FederalReturnDependent {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  ageAtYearEnd: number;
  relationship: string;
  relationshipLabel: string;
  monthsLivedWithTaxpayer: number;
  isStudent: boolean;
  isPermanentlyDisabled: boolean;
  isQualifyingChildForCtc: boolean;
  isQualifyingOtherDependent: boolean;
  isQualifyingCarePerson: boolean;
  claimedByOtherTaxpayer?: boolean;
}

export interface FederalReturnIncome {
  w2WagesCents: number;
  spouseW2WagesCents: number;
  gross1099IncomeCents: number;
  spouseGross1099IncomeCents: number;
  gigBusinessGrossCents: number;
  otherIncomeCents: number;
  totalGrossIncomeCents: number;
  w2Records: Array<{
    id: string;
    employerName: string;
    wagesCents: number;
    federalWithholdingCents: number;
  }>;
  form1099Records: Array<{
    id: string;
    payerName: string;
    incomeType: string;
    grossIncomeCents: number;
    federalWithholdingCents: number;
  }>;
  activityRecords: Array<{
    id: string;
    activityName: string;
    kind: string;
    grossReceiptsCents: number;
    expensesCents: number;
  }>;
}

export interface FederalReturnAdjustments {
  deductibleSelfEmploymentTaxCents: number;
  spouseDeductibleSelfEmploymentTaxCents: number;
  studentLoanInterestDeductionCents: number;
  studentLoanInterestClaimedCents: number;
  studentLoanInterestPhaseoutReductionCents: number;
  studentLoanInterestDisallowed: boolean;
  studentLoanInterestDisallowReason?: string;
  totalAboveTheLineDeductionsCents: number;
  adjustedGrossIncomeCents: number;
}

export interface FederalReturnDeductions {
  businessDeductions: {
    actualExpensesCents: number;
    mileageDeductionCents: number;
    businessMiles: number;
    ratePerMileCents: number;
    totalBusinessDeductionsCents: number;
    netSelfEmploymentProfitCents: number;
  };
  deductionType: "standard" | "itemized";
  deductionUsedCents: number;
  standardDeductionCents: number;
  itemizedDeductionCents: number;
  itemizedBreakdown?: ScheduleABreakdown;
  itemizedBenefitCents: number;
}

export interface FederalReturnCredits {
  childTaxCreditCents: number;
  creditForOtherDependentsCents: number;
  childAndDependentCareCreditCents: number;
  totalNonRefundableCreditsCents: number;
  additionalChildTaxCreditCents: number;
  earnedIncomeCreditCents: number;
  totalRefundableCreditsCents: number;
  totalCreditsCents: number;
  qualifyingChildrenCount: number;
  otherDependentsCount: number;
  qualifyingCarePersonsCount: number;
}

export interface FederalReturnTaxes {
  taxableIncomeCents: number;
  tentativeTaxCents: number;
  incomeTaxAfterCreditsCents: number;
  selfEmploymentTaxCents: number;
  totalTaxLiabilityCents: number;
  effectiveTaxRate: number;
  marginalTaxBracket: number;
}

export interface FederalReturnPayments {
  taxpayerFederalWithholdingCents: number;
  spouseFederalWithholdingCents: number;
  totalFederalWithholdingCents: number;
  refundableCreditsCents: number;
  totalPaymentsAndCreditsCents: number;
}

export interface FederalReturnRefundOrBalanceDue {
  type: "refund" | "balance_due" | "zero";
  amountCents: number;
  estimatedRefundCents: number;
  estimatedAmountOwedCents: number;
}

// =============================================================================
// 4. TOP-LEVEL FEDERAL RETURN ROOT MODEL
// =============================================================================

export interface FederalReturn {
  metadata: {
    returnId: string;
    sessionId: string;
    taxYear: TaxYear;
    generatedAt: string;
    engineVersion: string;
    rulesVersion: string;
    hasCalculation: boolean;
  };
  taxpayer: FederalReturnTaxpayer;
  spouse: FederalReturnSpouse;
  dependents: FederalReturnDependent[];
  filingStatus: {
    status: TaxFilingStatus;
    label: string;
    requiresSpouse: boolean;
    requiresDependent: boolean;
  };
  income: FederalReturnIncome;
  adjustments: FederalReturnAdjustments;
  deductions: FederalReturnDeductions;
  credits: FederalReturnCredits;
  taxes: FederalReturnTaxes;
  payments: FederalReturnPayments;
  refundOrBalanceDue: FederalReturnRefundOrBalanceDue;
  readiness: FederalReturnReadiness;
  reconciliation: FederalReturnReconciliation;
}

// Helper to format filing status labels
export function formatFilingStatusLabel(status: TaxFilingStatus): string {
  switch (status) {
    case "single":
      return "Single";
    case "married_filing_jointly":
      return "Married Filing Jointly";
    case "married_filing_separately":
      return "Married Filing Separately";
    case "head_of_household":
      return "Head of Household";
    case "qualifying_surviving_spouse":
      return "Qualifying Surviving Spouse";
    default:
      return status;
  }
}

// =============================================================================
// 5. DETERMINISTIC READINESS EVALUATION ENGINE
// =============================================================================

export function evaluateFederalReturnReadiness(
  session: TaxPreparationSession
): FederalReturnReadiness {
  const profile = session.profileSnapshot;
  const household = session.householdSnapshot;
  const income = session.incomeSnapshot;
  const deductions = session.deductionsSnapshot;
  const calc = session.calculationSnapshot;

  const categories: Record<FederalReturnCategoryKey, FederalReturnCategoryReadiness> = {
    taxpayer_info: {
      category: "taxpayer_info",
      title: "Taxpayer Identity",
      status: "complete",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "taxpayer_profile",
      actionLabel: "Edit Taxpayer Profile",
    },
    filing_status: {
      category: "filing_status",
      title: "Filing Status",
      status: "complete",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "taxpayer_profile",
      actionLabel: "Verify Filing Status",
    },
    household: {
      category: "household",
      title: "Spouse & Household",
      status: "complete",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "taxpayer_profile",
      actionLabel: "Update Household",
    },
    dependents: {
      category: "dependents",
      title: "Dependents & Family",
      status: "not_applicable",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "taxpayer_profile",
      actionLabel: "Manage Dependents",
    },
    income: {
      category: "income",
      title: "Income Sources",
      status: "complete",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "income",
      actionLabel: "Review Income Sources",
    },
    deductions: {
      category: "deductions",
      title: "Deductions & Adjustments",
      status: "complete",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "deductions",
      actionLabel: "Review Deductions",
    },
    credits: {
      category: "credits",
      title: "Family & Tax Credits",
      status: "not_applicable",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "taxpayer_profile",
      actionLabel: "Review Tax Credits",
    },
    payments: {
      category: "payments",
      title: "Tax Withholdings & Payments",
      status: "complete",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "income",
      actionLabel: "Check Withholdings",
    },
    calculation: {
      category: "calculation",
      title: "Deterministic Tax Engine Calculation",
      status: "complete",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "calculation",
      actionLabel: "Run Tax Calculation",
    },
    review: {
      category: "review",
      title: "Federal Return Review",
      status: "complete",
      missingItems: [],
      warnings: [],
      blockingItems: [],
      actionStep: "review",
      actionLabel: "Complete Review",
    },
  };

  // 1. Taxpayer Identity
  if (!profile.fullName || profile.fullName.trim() === "") {
    categories.taxpayer_info.status = "incomplete";
    categories.taxpayer_info.missingItems.push("Full legal name");
    categories.taxpayer_info.blockingItems.push("Taxpayer full name is required.");
  }

  // 2. Filing Status & Household Requirements
  const effectiveStatus = household?.filingStatus || profile.filingStatus;
  if (!effectiveStatus) {
    categories.filing_status.status = "incomplete";
    categories.filing_status.missingItems.push("Filing status");
    categories.filing_status.blockingItems.push("Federal filing status must be selected.");
  } else {
    // Married filing joint / separate requires spouse
    if (
      effectiveStatus === "married_filing_jointly" ||
      effectiveStatus === "married_filing_separately"
    ) {
      if (!household?.spouse || !household.spouse.firstName || !household.spouse.lastName) {
        categories.household.status = "incomplete";
        categories.household.missingItems.push("Spouse legal name");
        categories.household.blockingItems.push("Spouse details are required for married filing statuses.");
      }
    } else {
      categories.household.status = "not_applicable";
    }

    // Head of household requires at least 1 dependent
    if (effectiveStatus === "head_of_household") {
      if (!household?.dependents || household.dependents.length === 0) {
        categories.filing_status.status = "incomplete";
        categories.filing_status.blockingItems.push("Head of Household status requires at least one dependent.");
      }
    }

    // Qualifying surviving spouse requires at least 1 dependent child
    if (effectiveStatus === "qualifying_surviving_spouse") {
      const hasChild = household?.dependents?.some((d) =>
        ["child", "son", "daughter", "stepchild", "foster_child"].includes(d.relationship)
      );
      if (!hasChild) {
        categories.filing_status.status = "incomplete";
        categories.filing_status.blockingItems.push(
          "Qualifying Surviving Spouse status requires at least one dependent child."
        );
      }
    }
  }

  // 3. Dependents Check
  if (household?.dependents && household.dependents.length > 0) {
    categories.dependents.status = "complete";
    for (const dep of household.dependents) {
      if (!dep.firstName || !dep.lastName) {
        categories.dependents.status = "incomplete";
        categories.dependents.missingItems.push(`Legal name for dependent`);
        categories.dependents.blockingItems.push("All dependents must have a first and last name.");
      }
      if (!dep.dateOfBirth) {
        categories.dependents.status = "incomplete";
        categories.dependents.missingItems.push(`Date of birth for ${dep.firstName || "dependent"}`);
        categories.dependents.blockingItems.push("Dependent date of birth is required.");
      } else {
        const parsed = new Date(dep.dateOfBirth);
        if (isNaN(parsed.getTime()) || parsed > new Date()) {
          categories.dependents.status = "incomplete";
          categories.dependents.blockingItems.push(`Date of birth for ${dep.firstName} cannot be in the future.`);
        }
      }
    }
  } else {
    categories.dependents.status = "not_applicable";
  }

  // 4. Income Check
  const hasW2 = income.w2s.length > 0;
  const has1099 = income.form1099s.length > 0;
  const hasActivity = income.activities.length > 0;
  const totalW2Cents = income.w2s.reduce((s, w) => s + w.wagesCents, 0);
  const total1099Cents = income.form1099s.reduce((s, f) => s + f.grossIncomeCents, 0);
  const totalActivityCents = income.activities.reduce((s, a) => s + a.grossReceiptsCents, 0);
  const totalIncomeCents = totalW2Cents + total1099Cents + totalActivityCents;

  if (income.situations.length === 0) {
    categories.income.status = "incomplete";
    categories.income.missingItems.push("Income situations");
    categories.income.blockingItems.push("Select at least one way you earned income.");
  } else if (!hasW2 && !has1099 && !hasActivity && totalIncomeCents === 0) {
    categories.income.status = "incomplete";
    categories.income.missingItems.push("Income details");
    categories.income.blockingItems.push("Add at least one income source or job record.");
  }

  // 5. Deductions Check
  if (!deductions.saved && !deductions.standardDeductionAcknowledged) {
    categories.deductions.status = "incomplete";
    categories.deductions.missingItems.push("Deduction answers");
    categories.deductions.blockingItems.push("Complete guided deduction discovery or acknowledge standard deduction.");
  }

  // 6. Credits Check
  if (household?.dependents && household.dependents.length > 0) {
    categories.credits.status = "complete";
  } else {
    categories.credits.status = "not_applicable";
  }

  // 7. Payments Check
  const w2Withholding = income.w2s.reduce((s, w) => s + w.federalWithholdingCents, 0);
  const form1099Withholding = income.form1099s.reduce((s, f) => s + f.federalWithholdingCents, 0);
  const spouseWithholding = household?.spouse?.federalWithholdingCents ?? 0;
  const totalWithholding = w2Withholding + form1099Withholding + spouseWithholding;

  if (hasW2 && w2Withholding === 0) {
    categories.payments.status = "warning";
    categories.payments.warnings.push(
      "Your W-2 entries report $0 federal withholding. Please double-check Box 2 of your Form W-2."
    );
  }

  // 8. Calculation Check
  if (!calc) {
    categories.calculation.status = "incomplete";
    categories.calculation.missingItems.push("Tax calculation");
    categories.calculation.blockingItems.push("Deterministic tax engine calculation has not been executed yet.");
    categories.review.status = "incomplete";
    categories.review.blockingItems.push("Calculate taxes before final federal return review.");
  }

  // Aggregate all blocking items and warnings
  const summaryBlockingItems: string[] = [];
  const summaryWarnings: string[] = [];
  let completedCount = 0;
  let totalCount = 0;

  for (const cat of Object.values(categories)) {
    totalCount++;
    if (cat.status === "complete" || cat.status === "not_applicable") {
      completedCount++;
    }
    if (cat.blockingItems.length > 0) {
      summaryBlockingItems.push(...cat.blockingItems);
    }
    if (cat.warnings.length > 0) {
      summaryWarnings.push(...cat.warnings);
    }
  }

  const isReadyForReview = summaryBlockingItems.length === 0 && calc !== null && calc !== undefined;
  let overallStatus: FederalReturnReadinessStatus = "complete";
  if (summaryBlockingItems.length > 0) {
    overallStatus = "incomplete";
  } else if (summaryWarnings.length > 0) {
    overallStatus = "warning";
  }

  return {
    isReadyForReview,
    overallStatus,
    categories,
    summaryBlockingItems,
    summaryWarnings,
    completedCategoriesCount: completedCount,
    totalCategoriesCount: totalCount,
  };
}

// =============================================================================
// 6. DETERMINISTIC CALCULATION RECONCILIATION ENGINE
// =============================================================================

export function reconcileFederalReturnCalculations(
  session: TaxPreparationSession
): FederalReturnReconciliation {
  const calc = session.calculationSnapshot;
  const checks: ReconciliationCheck[] = [];
  const mismatches: string[] = [];

  if (!calc) {
    return {
      isReconciled: false,
      checks: [
        {
          id: "calc_presence",
          label: "Calculation Presence",
          passed: false,
          expectedCents: 0,
          actualCents: 0,
          differenceCents: 0,
          description: "Calculation is missing. Run the deterministic tax engine first.",
        },
      ],
      mismatches: ["Calculation snapshot is not present on the session."],
    };
  }

  // Check 1: Gross Income Reconciliation
  // Sum of primary W2, spouse W2, 1099 gross receipts, gig activities
  const income = session.incomeSnapshot;
  const household = session.householdSnapshot;
  const primaryW2 = income.w2s.reduce((s, w) => s + w.wagesCents, 0);
  const spouseW2 = household?.spouse?.w2WagesCents ?? 0;
  const form1099Gross = income.form1099s.reduce((s, f) => s + f.grossIncomeCents, 0);
  const spouse1099 = household?.spouse?.gross1099IncomeCents ?? 0;
  const gigGross = income.activities.reduce((s, a) => s + a.grossReceiptsCents, 0);
  const expectedGrossIncome = primaryW2 + spouseW2 + form1099Gross + spouse1099 + gigGross;
  const actualGrossIncome = calc.grossIncomeCents;
  const grossDiff = Math.abs(expectedGrossIncome - actualGrossIncome);
  checks.push({
    id: "check_gross_income",
    label: "Gross Income Component Reconciliation",
    passed: grossDiff === 0,
    expectedCents: expectedGrossIncome,
    actualCents: actualGrossIncome,
    differenceCents: grossDiff,
    description: "Component income matches total gross income deterministically.",
  });
  if (grossDiff !== 0) {
    mismatches.push(`Gross income mismatch: Expected ${expectedGrossIncome} cents, got ${actualGrossIncome} cents.`);
  }

  // Check 2: AGI Reconciliation (Gross Income - Above-the-Line Adjustments = AGI)
  const totalAboveTheLine = calc.aboveTheLineDeductions?.totalAboveTheLineCents ?? 0;
  const expectedAgi = Math.max(0, calc.grossIncomeCents - totalAboveTheLine);
  const actualAgi = calc.adjustedGrossIncomeCents;
  const agiDiff = Math.abs(expectedAgi - actualAgi);
  checks.push({
    id: "check_agi",
    label: "Adjusted Gross Income (AGI) Reconciliation",
    passed: agiDiff === 0,
    expectedCents: expectedAgi,
    actualCents: actualAgi,
    differenceCents: agiDiff,
    description: "Gross income minus above-the-line adjustments equals Adjusted Gross Income.",
  });
  if (agiDiff !== 0) {
    mismatches.push(`AGI mismatch: Expected ${expectedAgi} cents, got ${actualAgi} cents.`);
  }

  // Check 3: Taxable Income Reconciliation (AGI - Deduction Used = Taxable Income)
  const expectedTaxableIncome = Math.max(0, calc.adjustedGrossIncomeCents - calc.deductionUsedCents);
  const actualTaxableIncome = calc.taxableIncomeCents;
  const taxableDiff = Math.abs(expectedTaxableIncome - actualTaxableIncome);
  checks.push({
    id: "check_taxable_income",
    label: "Taxable Income Reconciliation",
    passed: taxableDiff === 0,
    expectedCents: expectedTaxableIncome,
    actualCents: actualTaxableIncome,
    differenceCents: taxableDiff,
    description: "Adjusted Gross Income minus allowable deduction equals taxable income.",
  });
  if (taxableDiff !== 0) {
    mismatches.push(`Taxable income mismatch: Expected ${expectedTaxableIncome} cents, got ${actualTaxableIncome} cents.`);
  }

  // Check 4: Tax Liability Reconciliation
  // (Tax Before Credits - Non-Refundable Credits) + Self-Employment Tax = Total Tax Liability
  const nonRefundableCredits = calc.credits?.totalNonRefundableCreditsCents ?? 0;
  const taxBefore = calc.taxBeforeCreditsCents ?? calc.federalIncomeTaxCents;
  const seTax = calc.selfEmploymentTaxCents;
  const incomeTaxAfterCredits = Math.max(0, taxBefore - nonRefundableCredits);
  const expectedTotalLiability = incomeTaxAfterCredits + seTax;
  const actualTotalLiability = calc.totalTaxLiabilityCents;
  const liabilityDiff = Math.abs(expectedTotalLiability - actualTotalLiability);
  checks.push({
    id: "check_total_tax_liability",
    label: "Total Tax Liability Reconciliation",
    passed: liabilityDiff === 0,
    expectedCents: expectedTotalLiability,
    actualCents: actualTotalLiability,
    differenceCents: liabilityDiff,
    description: "Net federal income tax plus self-employment tax equals total tax liability.",
  });
  if (liabilityDiff !== 0) {
    mismatches.push(
      `Total tax liability mismatch: Expected ${expectedTotalLiability} cents, got ${actualTotalLiability} cents.`
    );
  }

  // Check 5: Payments & Credits Reconciliation
  // Withholding + Refundable Credits = Total Payments
  const refundableCredits = calc.credits?.totalRefundableCreditsCents ?? 0;
  const withholding = calc.totalPaymentsAndWithholdingCents;
  const totalPayments = withholding + refundableCredits;
  checks.push({
    id: "check_payments_and_credits",
    label: "Total Payments and Refundable Credits Reconciliation",
    passed: true,
    expectedCents: totalPayments,
    actualCents: totalPayments,
    differenceCents: 0,
    description: "Total federal withholding plus refundable credits summed without loss.",
  });

  // Check 6: Refund or Balance Due Reconciliation
  let expectedRefund = 0;
  let expectedOwed = 0;
  if (totalPayments > actualTotalLiability) {
    expectedRefund = totalPayments - actualTotalLiability;
  } else {
    expectedOwed = actualTotalLiability - totalPayments;
  }
  const refundMatch = expectedRefund === calc.estimatedRefundCents && expectedOwed === calc.estimatedAmountOwedCents;
  checks.push({
    id: "check_refund_or_owed",
    label: "Refund or Balance Due Reconciliation",
    passed: refundMatch,
    expectedCents: expectedRefund > 0 ? expectedRefund : expectedOwed,
    actualCents: calc.estimatedRefundCents > 0 ? calc.estimatedRefundCents : calc.estimatedAmountOwedCents,
    differenceCents: Math.abs(
      (expectedRefund > 0 ? expectedRefund : expectedOwed) -
        (calc.estimatedRefundCents > 0 ? calc.estimatedRefundCents : calc.estimatedAmountOwedCents)
    ),
    description: "Payments vs tax liability matches final refund or amount owed exactly.",
  });
  if (!refundMatch) {
    mismatches.push("Refund / balance due does not match total payments minus total tax liability.");
  }

  const isReconciled = checks.every((c) => c.passed) && mismatches.length === 0;

  return {
    isReconciled,
    checks,
    mismatches,
  };
}

// =============================================================================
// 7. DETERMINISTIC RETURN BUILDER AGGREGATE
// =============================================================================

export function buildFederalReturn(session: TaxPreparationSession): FederalReturn {
  const taxYear = session.taxYear;
  const rules = getTaxYearRules(taxYear);
  const profile = session.profileSnapshot;
  const household = session.householdSnapshot;
  const income = session.incomeSnapshot;
  const deductions = session.deductionsSnapshot;
  const calc = session.calculationSnapshot;

  const filingStatus = household?.filingStatus || profile.filingStatus;
  const filingStatusLabel = formatFilingStatusLabel(filingStatus);

  // 1. Taxpayer
  const taxpayer: FederalReturnTaxpayer = {
    id: session.userId,
    fullName: profile.fullName,
    stateOfResidence: profile.stateOfResidence,
    taxYear,
    filingStatus,
    filingStatusLabel,
    isClaimedAsDependent: false,
  };

  // 2. Spouse
  const hasSpouse =
    Boolean(household?.spouse) &&
    (filingStatus === "married_filing_jointly" || filingStatus === "married_filing_separately");

  const spouse: FederalReturnSpouse = {
    hasSpouse,
    firstName: household?.spouse?.firstName,
    lastName: household?.spouse?.lastName,
    fullName:
      household?.spouse?.firstName && household?.spouse?.lastName
        ? `${household.spouse.firstName} ${household.spouse.lastName}`
        : undefined,
    dateOfBirth: household?.spouse?.dateOfBirth,
    ssnLast4: household?.spouse?.ssnLast4,
    hasW2Income: household?.spouse?.hasW2Income,
    w2WagesCents: household?.spouse?.w2WagesCents ?? 0,
    hasSelfEmploymentIncome: household?.spouse?.hasSelfEmploymentIncome,
    gross1099IncomeCents: household?.spouse?.gross1099IncomeCents ?? 0,
    businessExpensesCents: household?.spouse?.businessExpensesCents ?? 0,
    federalWithholdingCents: household?.spouse?.federalWithholdingCents ?? 0,
  };

  // 3. Dependents
  const dependents: FederalReturnDependent[] = (household?.dependents || []).map((dep) => {
    const ageAtYearEnd = calculateAgeAtTaxYearEnd(dep.dateOfBirth, taxYear);
    const relLabel = DEPENDENT_RELATIONSHIP_LABELS[dep.relationship] || dep.relationship;
    return {
      id: dep.id,
      firstName: dep.firstName,
      lastName: dep.lastName,
      fullName: `${dep.firstName} ${dep.lastName}`,
      dateOfBirth: dep.dateOfBirth,
      ageAtYearEnd,
      relationship: dep.relationship,
      relationshipLabel: relLabel,
      monthsLivedWithTaxpayer: dep.monthsLivedWithTaxpayer,
      isStudent: Boolean(dep.isFullTimeStudent),
      isPermanentlyDisabled: Boolean(dep.isPermanentlyDisabled),
      isQualifyingChildForCtc: isQualifyingChildForCtc(dep, taxYear),
      isQualifyingOtherDependent: isQualifyingOtherDependent(dep, taxYear),
      isQualifyingCarePerson: isQualifyingPersonForCdctc(dep, taxYear),
      claimedByOtherTaxpayer: dep.claimedByOtherTaxpayer,
    };
  });

  // 4. Filing Status
  const filingStatusObj = {
    status: filingStatus,
    label: filingStatusLabel,
    requiresSpouse: filingStatus === "married_filing_jointly" || filingStatus === "married_filing_separately",
    requiresDependent: filingStatus === "head_of_household" || filingStatus === "qualifying_surviving_spouse",
  };

  // 5. Income
  const w2WagesCents = income.w2s.reduce((s, w) => s + w.wagesCents, 0);
  const spouseW2WagesCents = spouse.w2WagesCents ?? 0;
  const gross1099IncomeCents = income.form1099s.reduce((s, f) => s + f.grossIncomeCents, 0);
  const spouseGross1099IncomeCents = spouse.gross1099IncomeCents ?? 0;
  const gigBusinessGrossCents = income.activities.reduce((s, a) => s + a.grossReceiptsCents, 0);
  const totalGrossIncomeCents =
    calc?.grossIncomeCents ??
    w2WagesCents + spouseW2WagesCents + gross1099IncomeCents + spouseGross1099IncomeCents + gigBusinessGrossCents;

  const incomeObj: FederalReturnIncome = {
    w2WagesCents,
    spouseW2WagesCents,
    gross1099IncomeCents,
    spouseGross1099IncomeCents,
    gigBusinessGrossCents,
    otherIncomeCents: 0,
    totalGrossIncomeCents,
    w2Records: income.w2s.map((w) => ({
      id: w.id,
      employerName: w.employerName,
      wagesCents: w.wagesCents,
      federalWithholdingCents: w.federalWithholdingCents,
    })),
    form1099Records: income.form1099s.map((f) => ({
      id: f.id,
      payerName: f.payerName,
      incomeType: f.incomeType,
      grossIncomeCents: f.grossIncomeCents,
      federalWithholdingCents: f.federalWithholdingCents,
    })),
    activityRecords: income.activities.map((a) => ({
      id: a.id,
      activityName: a.activityName,
      kind: a.kind,
      grossReceiptsCents: a.grossReceiptsCents,
      expensesCents:
        a.equipmentSuppliesCents +
        a.softwareSubscriptionsCents +
        a.homeOfficeVehicleCents +
        a.otherExpensesCents,
    })),
  };

  // 6. Adjustments (Above-the-Line)
  const deductibleSeTax = calc?.aboveTheLineDeductions?.deductibleHalfSeTaxCents ?? 0;
  const studentLoanDeduction = calc?.aboveTheLineDeductions?.studentLoanInterestCents ?? 0;
  const totalAboveTheLine = calc?.aboveTheLineDeductions?.totalAboveTheLineCents ?? deductibleSeTax + studentLoanDeduction;
  const adjustedGrossIncomeCents = calc?.adjustedGrossIncomeCents ?? Math.max(0, totalGrossIncomeCents - totalAboveTheLine);

  const adjustments: FederalReturnAdjustments = {
    deductibleSelfEmploymentTaxCents: deductibleSeTax,
    spouseDeductibleSelfEmploymentTaxCents: 0,
    studentLoanInterestDeductionCents: studentLoanDeduction,
    studentLoanInterestClaimedCents: deductions.guidedAnswers?.education?.studentLoanInterestCents ?? studentLoanDeduction,
    studentLoanInterestPhaseoutReductionCents: Math.max(
      0,
      (deductions.guidedAnswers?.education?.studentLoanInterestCents ?? studentLoanDeduction) - studentLoanDeduction
    ),
    studentLoanInterestDisallowed: filingStatus === "married_filing_separately",
    studentLoanInterestDisallowReason:
      filingStatus === "married_filing_separately"
        ? "Married filing separately filers cannot claim student loan interest."
        : undefined,
    totalAboveTheLineDeductionsCents: totalAboveTheLine,
    adjustedGrossIncomeCents,
  };

  // 7. Deductions
  const businessExpensesCents = deductions.entries
    .filter((e) => e.confirmed && isBusinessDeductionCategory(e.category))
    .reduce((s, e) => s + e.amountCents, 0);

  const businessMiles = calc?.mileageDetails?.businessMiles ?? deductions.guidedAnswers?.business?.milesDriven ?? 0;
  const mileageDeductionCents = calc?.mileageDetails?.mileageDeductionCents ?? 0;
  const ratePerMileCents = calc?.mileageDetails?.ratePerMileCents ?? rules.mileage?.standardRateCentsPerMile ?? 70;
  const totalBusinessDeductionsCents = businessExpensesCents + mileageDeductionCents;
  const netSeProfit = calc?.selfEmploymentDetails?.netSelfEmploymentProfitCents ?? Math.max(0, gross1099IncomeCents - totalBusinessDeductionsCents);

  const deductionUsedCents = calc?.deductionUsedCents ?? rules.standardDeductions[filingStatus];
  const deductionType = calc?.deductionType ?? "standard";
  const standardDeductionCents = rules.standardDeductions[filingStatus];
  const itemizedTotal = calc?.itemizedBreakdown?.totalScheduleACents ?? 0;
  const itemizedBenefitCents = deductionType === "itemized" ? Math.max(0, itemizedTotal - standardDeductionCents) : 0;

  const deductionsObj: FederalReturnDeductions = {
    businessDeductions: {
      actualExpensesCents: businessExpensesCents,
      mileageDeductionCents,
      businessMiles,
      ratePerMileCents,
      totalBusinessDeductionsCents,
      netSelfEmploymentProfitCents: netSeProfit,
    },
    deductionType,
    deductionUsedCents,
    standardDeductionCents,
    itemizedDeductionCents: itemizedTotal,
    itemizedBreakdown: calc?.itemizedBreakdown,
    itemizedBenefitCents,
  };

  // 8. Credits
  const creditsObj: FederalReturnCredits = {
    childTaxCreditCents: calc?.credits?.childTaxCreditCents ?? 0,
    creditForOtherDependentsCents: calc?.credits?.creditForOtherDependentsCents ?? 0,
    childAndDependentCareCreditCents: calc?.credits?.childAndDependentCareCreditCents ?? 0,
    totalNonRefundableCreditsCents: calc?.credits?.totalNonRefundableCreditsCents ?? 0,
    additionalChildTaxCreditCents: calc?.credits?.additionalChildTaxCreditCents ?? 0,
    earnedIncomeCreditCents: calc?.credits?.earnedIncomeCreditCents ?? 0,
    totalRefundableCreditsCents: calc?.credits?.totalRefundableCreditsCents ?? 0,
    totalCreditsCents: calc?.credits?.totalCreditsCents ?? 0,
    qualifyingChildrenCount: calc?.credits?.qualifyingChildrenCount ?? 0,
    otherDependentsCount: calc?.credits?.otherDependentsCount ?? 0,
    qualifyingCarePersonsCount: calc?.credits?.qualifyingCarePersonsCount ?? 0,
  };

  // 9. Taxes
  const taxableIncomeCents = calc?.taxableIncomeCents ?? Math.max(0, adjustedGrossIncomeCents - deductionUsedCents);
  const tentativeTaxCents = calc?.taxBeforeCreditsCents ?? calc?.federalIncomeTaxCents ?? 0;
  const incomeTaxAfterCreditsCents = Math.max(0, tentativeTaxCents - creditsObj.totalNonRefundableCreditsCents);
  const selfEmploymentTaxCents = calc?.selfEmploymentTaxCents ?? 0;
  const totalTaxLiabilityCents = calc?.totalTaxLiabilityCents ?? incomeTaxAfterCreditsCents + selfEmploymentTaxCents;

  const taxesObj: FederalReturnTaxes = {
    taxableIncomeCents,
    tentativeTaxCents,
    incomeTaxAfterCreditsCents,
    selfEmploymentTaxCents,
    totalTaxLiabilityCents,
    effectiveTaxRate: calc?.effectiveTaxRate ?? 0,
    marginalTaxBracket: calc?.marginalTaxBracket ?? 0,
  };

  // 10. Payments
  const taxpayerFederalWithholdingCents = income.w2s.reduce((s, w) => s + w.federalWithholdingCents, 0);
  const spouseFederalWithholdingCents = spouse.federalWithholdingCents ?? 0;
  const totalFederalWithholdingCents = taxpayerFederalWithholdingCents + spouseFederalWithholdingCents;
  const refundableCreditsCents = creditsObj.totalRefundableCreditsCents;
  const totalPaymentsAndCreditsCents = totalFederalWithholdingCents + refundableCreditsCents;

  const paymentsObj: FederalReturnPayments = {
    taxpayerFederalWithholdingCents,
    spouseFederalWithholdingCents,
    totalFederalWithholdingCents,
    refundableCreditsCents,
    totalPaymentsAndCreditsCents,
  };

  // 11. Refund / Balance Due
  let refundType: "refund" | "balance_due" | "zero" = "zero";
  let refundAmount = 0;
  if (totalPaymentsAndCreditsCents > totalTaxLiabilityCents) {
    refundType = "refund";
    refundAmount = totalPaymentsAndCreditsCents - totalTaxLiabilityCents;
  } else if (totalTaxLiabilityCents > totalPaymentsAndCreditsCents) {
    refundType = "balance_due";
    refundAmount = totalTaxLiabilityCents - totalPaymentsAndCreditsCents;
  }

  const refundOrBalanceDue: FederalReturnRefundOrBalanceDue = {
    type: refundType,
    amountCents: refundAmount,
    estimatedRefundCents: refundType === "refund" ? refundAmount : 0,
    estimatedAmountOwedCents: refundType === "balance_due" ? refundAmount : 0,
  };

  // 12. Readiness
  const readiness = evaluateFederalReturnReadiness(session);

  // 13. Reconciliation
  const reconciliation = reconcileFederalReturnCalculations(session);

  return {
    metadata: {
      returnId: `fed-${session.id}`,
      sessionId: session.id,
      taxYear,
      generatedAt: new Date().toISOString(),
      engineVersion: calc?.engineVersion ?? "1.1.0-production-baseline",
      rulesVersion: calc?.rulesVersion ?? rules.version,
      hasCalculation: calc !== null && calc !== undefined,
    },
    taxpayer,
    spouse,
    dependents,
    filingStatus: filingStatusObj,
    income: incomeObj,
    adjustments,
    deductions: deductionsObj,
    credits: creditsObj,
    taxes: taxesObj,
    payments: paymentsObj,
    refundOrBalanceDue,
    readiness,
    reconciliation,
  };
}
