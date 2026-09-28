import { TaxFilingStatus, TaxYear } from "@/types/tax";
import {
  IncomeTaxCalculationInput,
  QuarterlyTaxCalculationInput,
  SelfEmployedCalculationInput,
} from "@/types/tax";
import { PreparationCalculatorLink, PREPARATION_CALCULATORS } from "@/lib/preparation/calculators";

export const INCOME_SITUATIONS = ["employer", "freelance", "gig", "business"] as const;
export type IncomeSituation = (typeof INCOME_SITUATIONS)[number];

export const FORM_1099_INCOME_TYPES = ["freelance", "gig", "other"] as const;
export type Form1099IncomeType = (typeof FORM_1099_INCOME_TYPES)[number];

export const ACTIVITY_KINDS = ["gig", "business"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface W2IncomeEntry {
  id: string;
  employerName: string;
  wagesCents: number;
  federalWithholdingCents: number;
}

export interface Form1099IncomeEntry {
  id: string;
  incomeType: Form1099IncomeType;
  payerName: string;
  grossIncomeCents: number;
  federalWithholdingCents: number;
}

export interface SelfEmploymentActivity {
  id: string;
  kind: ActivityKind;
  activityName: string;
  grossReceiptsCents: number;
  equipmentSuppliesCents: number;
  softwareSubscriptionsCents: number;
  homeOfficeVehicleCents: number;
  otherExpensesCents: number;
}

export interface IncomeDiscovery {
  situations: IncomeSituation[];
  w2s: W2IncomeEntry[];
  form1099s: Form1099IncomeEntry[];
  activities: SelfEmploymentActivity[];
}

export interface IncomeSourceSummary {
  id: string;
  label: string;
}

export function emptyIncomeDiscovery(): IncomeDiscovery {
  return {
    situations: [],
    w2s: [],
    form1099s: [],
    activities: [],
  };
}

export function activityExpenseCents(activity: SelfEmploymentActivity): number {
  return (
    activity.equipmentSuppliesCents +
    activity.softwareSubscriptionsCents +
    activity.homeOfficeVehicleCents +
    activity.otherExpensesCents
  );
}

export function listIncomeSources(income: IncomeDiscovery): IncomeSourceSummary[] {
  return [
    ...income.w2s.map((entry) => ({
      id: entry.id,
      label: `W-2 job — ${entry.employerName}`,
    })),
    ...income.form1099s.map((entry) => ({
      id: entry.id,
      label: `Freelance — ${entry.payerName}`,
    })),
    ...income.activities.map((entry) => ({
      id: entry.id,
      label: `${entry.kind === "gig" ? "Gig work" : "Business"} — ${entry.activityName}`,
    })),
  ];
}

export interface PreparationCalculatorPayloads {
  incomeTax: IncomeTaxCalculationInput;
  selfEmployed: SelfEmployedCalculationInput;
  quarterly: QuarterlyTaxCalculationInput;
}

/**
 * Rolls saved income records into the existing calculator input shapes.
 * This does not compute tax. The tax engine remains the only calculator.
 */
export function buildPreparationCalculatorInputs(
  income: IncomeDiscovery,
  taxYear: TaxYear,
  filingStatus: TaxFilingStatus
): PreparationCalculatorPayloads {
  const w2WagesCents = income.w2s.reduce((sum, entry) => sum + entry.wagesCents, 0);
  const w2WithholdingCents = income.w2s.reduce((sum, entry) => sum + entry.federalWithholdingCents, 0);
  const form1099GrossCents = income.form1099s.reduce((sum, entry) => sum + entry.grossIncomeCents, 0);
  const form1099WithholdingCents = income.form1099s.reduce(
    (sum, entry) => sum + entry.federalWithholdingCents,
    0
  );
  const activityGrossCents = income.activities.reduce((sum, entry) => sum + entry.grossReceiptsCents, 0);
  const businessExpensesCents = income.activities.reduce(
    (sum, entry) => sum + activityExpenseCents(entry),
    0
  );

  const gross1099IncomeCents = form1099GrossCents + activityGrossCents;
  const federalWithholdingCents = w2WithholdingCents + form1099WithholdingCents;

  return {
    incomeTax: {
      taxYear,
      filingStatus,
      w2WagesCents,
      otherIncomeCents: 0,
      federalWithholdingCents: w2WithholdingCents,
      itemizedDeductionCents: 0,
    },
    selfEmployed: {
      taxYear,
      filingStatus,
      gross1099IncomeCents,
      businessExpensesCents,
      w2WagesCents,
      federalWithholdingCents,
      hasOtherSelfEmploymentIncome: income.activities.length > 0 && income.form1099s.length > 0,
    },
    quarterly: {
      taxYear,
      filingStatus,
      estimatedAnnualGrossCents: w2WagesCents + gross1099IncomeCents,
      estimatedAnnualExpensesCents: businessExpensesCents,
      w2AnnualWagesCents: w2WagesCents,
      w2AnnualWithholdingCents: w2WithholdingCents,
    },
  };
}

export function suggestCalculatorsForIncome(income: IncomeDiscovery): PreparationCalculatorLink[] {
  const hasW2 = income.situations.includes("employer");
  const hasNonW2 = income.situations.some((situation) => situation !== "employer");
  return PREPARATION_CALCULATORS.filter((calculator) => {
    if (calculator.calculatorType === "income_tax") {
      return hasW2;
    }
    return hasNonW2;
  });
}
