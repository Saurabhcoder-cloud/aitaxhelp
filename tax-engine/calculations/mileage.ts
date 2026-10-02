import { TaxYear } from "../../types/tax";
import { getTaxRules } from "../rules";

export interface MileageDeductionResult {
  businessMiles: number;
  ratePerMileCents: number;
  hundredthsRateCents: number;
  deductionCents: number;
}

/**
 * Deterministically computes the IRS standard business mileage deduction in integer cents.
 * Sourced from annual IRS notices (Rev. Proc. 2019-46).
 *
 * Example:
 * 2023: 65.5¢ / mile (6550 hundredths) -> 1,000 miles = $655.00 (65,500 cents)
 * 2024: 67.0¢ / mile (6700 hundredths) -> 1,000 miles = $670.00 (67,000 cents)
 * 2025: 70.0¢ / mile (7000 hundredths) -> 1,000 miles = $700.00 (70,000 cents)
 * 2026: 70.0¢ / mile (7000 hundredths) -> 1,000 miles = $700.00 (70,000 cents)
 */
export function calculateMileageDeduction(
  taxYear: TaxYear,
  businessMiles: number
): MileageDeductionResult {
  if (!businessMiles || businessMiles <= 0) {
    return {
      businessMiles: 0,
      ratePerMileCents: 0,
      hundredthsRateCents: 0,
      deductionCents: 0,
    };
  }

  const validMiles = Math.round(businessMiles);
  const rules = getTaxRules(taxYear);
  const mileageRules = rules.mileage;

  const hundredthsRateCents = mileageRules?.hundredthsRateCents ?? 7000;
  const ratePerMileCents = mileageRules?.standardRateCentsPerMile ?? 70;

  // Math.round((validMiles * hundredthsRateCents) / 100) maintains exact integer cent precision
  const deductionCents = Math.round((validMiles * hundredthsRateCents) / 100);

  return {
    businessMiles: validMiles,
    ratePerMileCents,
    hundredthsRateCents,
    deductionCents,
  };
}
