import { TaxYear } from "../../types/tax";
import { TaxYearRules } from "../types";
import { RULES_2026 } from "./2026";
import { RULES_2025 } from "./2025";
import { RULES_2024 } from "./2024";
import { RULES_2023 } from "./2023";

const REGISTRY: Record<TaxYear, TaxYearRules> = {
  2026: RULES_2026,
  2025: RULES_2025,
  2024: RULES_2024,
  2023: RULES_2023,
};

export const SUPPORTED_TAX_YEARS: TaxYear[] = [2026, 2025, 2024, 2023];
export const DEFAULT_TAX_YEAR: TaxYear = 2025;

/**
 * Retrieves the authoritative IRS rules for the specified tax year.
 * Throws a deterministic, structured error if the requested year is not officially verified.
 */
export function getTaxRules(year: number): TaxYearRules {
  if (!isSupportedTaxYear(year)) {
    throw new Error(
      `Tax year ${year} is not supported. Supported tax years: ${SUPPORTED_TAX_YEARS.join(
        ", "
      )}. Do not guess unsupported rules.`
    );
  }
  return REGISTRY[year];
}

export function isSupportedTaxYear(year: number): year is TaxYear {
  return year in REGISTRY;
}

export { RULES_2026, RULES_2025, RULES_2024, RULES_2023 };
