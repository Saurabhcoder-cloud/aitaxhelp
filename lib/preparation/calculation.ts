import {
  TaxCalculationResult,
  CalculatorType,
  IncomeTaxCalculationInput,
  SelfEmployedCalculationInput,
  TaxYear,
  DependentInput,
  SpouseInput,
} from "@/types/tax";
import { HouseholdSnapshot } from "@/lib/preparation/household";
import {
  calculateIncomeTax,
  calculateSelfEmployedTax,
} from "@/tax-engine";
import {
  IncomeDiscovery,
  activityExpenseCents,
} from "@/lib/preparation/income";
import {
  DeductionDiscovery,
  deductionExpenseCents,
} from "@/lib/preparation/deductions";
import {
  PreparationProfileSnapshot,
  PreparationStepMap,
} from "@/lib/preparation/steps";
import { DocumentsSnapshot } from "@/lib/preparation/documents";
import {
  assessCalculationReadiness,
  CalculationReadiness,
} from "@/lib/preparation/situation-summary";
import { AppError } from "@/lib/utils/errors";

export interface PreparationCalculationEngineInput {
  calculatorType: CalculatorType;
  inputSnapshot: IncomeTaxCalculationInput | SelfEmployedCalculationInput;
}

export interface PreparationCalculationExecution {
  calculatorType: CalculatorType;
  inputSnapshot: IncomeTaxCalculationInput | SelfEmployedCalculationInput;
  result: TaxCalculationResult;
}

export interface PreparationCalculationSessionData {
  taxYear: TaxYear;
  profileSnapshot: PreparationProfileSnapshot;
  steps: PreparationStepMap;
  householdSnapshot?: HouseholdSnapshot;
  incomeSnapshot: IncomeDiscovery;
  documentsSnapshot: DocumentsSnapshot;
  deductionsSnapshot: DeductionDiscovery;
}

/**
 * Resolves the confirmed business expenses/deductions for the preparation session.
 * If deduction discovery was completed and saved, uses confirmed deduction entries.
 * Otherwise falls back to expenses entered on self-employment activities.
 */
export function resolvePreparationExpenseCents(
  deductions: DeductionDiscovery,
  income: IncomeDiscovery
): number {
  if (deductions.saved) {
    if (deductions.hasBusinessExpenses === false) {
      return 0;
    }
    return deductionExpenseCents(deductions);
  }
  return income.activities.reduce((sum, entry) => sum + activityExpenseCents(entry), 0);
}

/**
 * Resolves gross 1099, gig, and self-employment business receipts.
 */
export function resolvePreparationGross1099Cents(income: IncomeDiscovery): number {
  const form1099Gross = income.form1099s.reduce((sum, entry) => sum + entry.grossIncomeCents, 0);
  const activityGross = income.activities.reduce((sum, entry) => sum + entry.grossReceiptsCents, 0);
  return form1099Gross + activityGross;
}

/**
 * Resolves total W-2 wages.
 */
export function resolvePreparationW2WagesCents(income: IncomeDiscovery): number {
  return income.w2s.reduce((sum, entry) => sum + entry.wagesCents, 0);
}

/**
 * Resolves federal withholding across both W-2 entries and 1099 entries.
 */
export function resolvePreparationWithholdingCents(income: IncomeDiscovery): {
  w2WithholdingCents: number;
  form1099WithholdingCents: number;
  totalWithholdingCents: number;
} {
  const w2WithholdingCents = income.w2s.reduce(
    (sum, entry) => sum + entry.federalWithholdingCents,
    0
  );
  const form1099WithholdingCents = income.form1099s.reduce(
    (sum, entry) => sum + entry.federalWithholdingCents,
    0
  );
  return {
    w2WithholdingCents,
    form1099WithholdingCents,
    totalWithholdingCents: w2WithholdingCents + form1099WithholdingCents,
  };
}

/**
 * Validates preparation session readiness for calculation.
 * Returns readiness evaluation with missing fields, warnings, and blocking errors.
 */
export function validatePreparationSessionForCalculation(
  session: PreparationCalculationSessionData
): CalculationReadiness {
  return assessCalculationReadiness({
    profile: session.profileSnapshot,
    steps: session.steps,
    household: session.householdSnapshot,
    income: session.incomeSnapshot,
    documents: session.documentsSnapshot,
    deductions: session.deductionsSnapshot,
  });
}

/**
 * Maps preparation session data cleanly into the input format required
 * by the existing deterministic tax engine.
 *
 * Enforces:
 * - W-2 only -> income_tax calculator
 * - 1099 / self-employed / gig / business expenses -> self_employed calculator
 * - Combined W-2 wages + 1099 income + withholdings correctly aggregated.
 * - Family / Household / Dependents mapped for CTC, ACTC, ODC, and EITC calculation.
 */
export function mapPreparationSessionToEngineInput(
  session: PreparationCalculationSessionData
): PreparationCalculationEngineInput {
  const readiness = validatePreparationSessionForCalculation(session);
  if (!readiness.ready) {
    const errorDetails = [...readiness.missing, ...readiness.errors].join("; ");
    throw new AppError(
      `Cannot calculate tax: Preparation session is incomplete (${errorDetails}).`,
      422,
      "VALIDATION_ERROR"
    );
  }

  const effectiveFilingStatus =
    session.householdSnapshot?.filingStatus || session.profileSnapshot.filingStatus;
  const w2WagesCents = resolvePreparationW2WagesCents(session.incomeSnapshot);
  const withholding = resolvePreparationWithholdingCents(session.incomeSnapshot);
  const gross1099IncomeCents = resolvePreparationGross1099Cents(session.incomeSnapshot);
  const businessExpensesCents = resolvePreparationExpenseCents(
    session.deductionsSnapshot,
    session.incomeSnapshot
  );

  const dependents: DependentInput[] = (session.householdSnapshot?.dependents || []).map((dep) => ({
    id: dep.id,
    firstName: dep.firstName,
    lastName: dep.lastName,
    dateOfBirth: dep.dateOfBirth,
    relationship: dep.relationship,
    isQualifyingChild: dep.isQualifyingChild,
    monthsLivedWithTaxpayer: dep.monthsLivedWithTaxpayer,
    isFullTimeStudent: dep.isFullTimeStudent,
    isPermanentlyDisabled: dep.isPermanentlyDisabled,
    providedMoreThanHalfSupport: dep.providedMoreThanHalfSupport,
  }));

  const spouse: SpouseInput | undefined = session.householdSnapshot?.spouse
    ? {
        firstName: session.householdSnapshot.spouse.firstName,
        lastName: session.householdSnapshot.spouse.lastName,
        dateOfBirth: session.householdSnapshot.spouse.dateOfBirth,
        hasW2Income: session.householdSnapshot.spouse.hasW2Income,
        w2WagesCents: session.householdSnapshot.spouse.w2WagesCents,
        hasSelfEmploymentIncome: session.householdSnapshot.spouse.hasSelfEmploymentIncome,
        gross1099IncomeCents: session.householdSnapshot.spouse.gross1099IncomeCents,
        businessExpensesCents: session.householdSnapshot.spouse.businessExpensesCents,
        federalWithholdingCents: session.householdSnapshot.spouse.federalWithholdingCents,
      }
    : undefined;

  const spouseWithholding = spouse?.federalWithholdingCents || 0;
  const totalWithholdingCents = withholding.totalWithholdingCents + spouseWithholding;
  const totalW2WithholdingCents = withholding.w2WithholdingCents + spouseWithholding;

  const spouseHasSelfEmployment = Boolean(
    spouse?.hasSelfEmploymentIncome &&
      ((spouse?.gross1099IncomeCents && spouse.gross1099IncomeCents > 0) ||
        (spouse?.businessExpensesCents && spouse.businessExpensesCents > 0))
  );

  const hasSelfEmployedOr1099 =
    gross1099IncomeCents > 0 ||
    businessExpensesCents > 0 ||
    session.incomeSnapshot.form1099s.length > 0 ||
    session.incomeSnapshot.activities.length > 0 ||
    session.incomeSnapshot.situations.some((situation) => situation !== "employer") ||
    spouseHasSelfEmployment;

  if (hasSelfEmployedOr1099) {
    const input: SelfEmployedCalculationInput = {
      taxYear: session.taxYear,
      filingStatus: effectiveFilingStatus,
      gross1099IncomeCents,
      businessExpensesCents,
      w2WagesCents,
      federalWithholdingCents: totalWithholdingCents,
      hasOtherSelfEmploymentIncome:
        session.incomeSnapshot.activities.length > 0 &&
        session.incomeSnapshot.form1099s.length > 0,
      dependents: dependents.length > 0 ? dependents : undefined,
      spouse,
    };
    return {
      calculatorType: "self_employed",
      inputSnapshot: input,
    };
  }

  const input: IncomeTaxCalculationInput = {
    taxYear: session.taxYear,
    filingStatus: effectiveFilingStatus,
    w2WagesCents,
    otherIncomeCents: 0,
    federalWithholdingCents: totalW2WithholdingCents,
    itemizedDeductionCents: 0,
    dependents: dependents.length > 0 ? dependents : undefined,
    spouse,
  };
  return {
    calculatorType: "income_tax",
    inputSnapshot: input,
  };
}

/**
 * Executes deterministic tax engine calculation for the preparation session.
 * NOTE: The deterministic tax engine is the ONLY authority for numeric tax calculations.
 * No formulas or numeric calculations are duplicated here.
 */
export function executePreparationCalculation(
  session: PreparationCalculationSessionData
): PreparationCalculationExecution {
  const mapped = mapPreparationSessionToEngineInput(session);

  let result: TaxCalculationResult;
  if (mapped.calculatorType === "income_tax") {
    result = calculateIncomeTax(mapped.inputSnapshot as IncomeTaxCalculationInput);
  } else {
    result = calculateSelfEmployedTax(mapped.inputSnapshot as SelfEmployedCalculationInput);
  }

  return {
    calculatorType: mapped.calculatorType,
    inputSnapshot: mapped.inputSnapshot,
    result,
  };
}
