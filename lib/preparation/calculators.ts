import { PreparationProfileSnapshot } from "./steps";

export type PreparationCalculatorType =
  | "income_tax"
  | "1099"
  | "self_employed"
  | "quarterly_tax";

export interface PreparationCalculatorLink {
  calculatorType: PreparationCalculatorType;
  label: string;
  href: string;
  form:
    | "IncomeTaxCalculatorForm"
    | "Tax1099CalculatorForm"
    | "SelfEmployedCalculatorForm"
    | "QuarterlyTaxCalculatorForm";
}

/**
 * Existing calculator pages the preparation flow will orchestrate later.
 * This phase does not embed or replace those forms.
 */
export const PREPARATION_CALCULATORS: readonly PreparationCalculatorLink[] = [
  {
    calculatorType: "income_tax",
    label: "Federal income tax",
    href: "/tax-calculators/income-tax",
    form: "IncomeTaxCalculatorForm",
  },
  {
    calculatorType: "1099",
    label: "1099 contractor",
    href: "/tax-calculators/1099",
    form: "Tax1099CalculatorForm",
  },
  {
    calculatorType: "self_employed",
    label: "Self-employed",
    href: "/tax-calculators/self-employed",
    form: "SelfEmployedCalculatorForm",
  },
  {
    calculatorType: "quarterly_tax",
    label: "Quarterly estimated tax",
    href: "/tax-calculators/quarterly-tax",
    form: "QuarterlyTaxCalculatorForm",
  },
];

export function suggestPreparationCalculators(
  snapshot: PreparationProfileSnapshot
): PreparationCalculatorLink[] {
  return PREPARATION_CALCULATORS.filter((calculator) => {
    if (calculator.calculatorType === "income_tax") {
      return snapshot.hasW2Income;
    }
    if (calculator.calculatorType === "1099") {
      return snapshot.has1099Income;
    }
    if (calculator.calculatorType === "self_employed") {
      return snapshot.has1099Income || snapshot.hasBusinessExpenses;
    }
    return snapshot.has1099Income || snapshot.hasBusinessExpenses;
  });
}
