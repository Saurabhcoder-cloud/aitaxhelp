import { TaxYear } from "../../types/tax";
import { getTaxRules } from "../rules";

export interface SelfEmploymentTaxOutput {
  netSelfEmploymentProfitCents: number;
  taxableSelfEmploymentProfitCents: number;
  socialSecurityTaxCents: number;
  medicareTaxCents: number;
  totalSelfEmploymentTaxCents: number;
  deductibleHalfCents: number;
}

/**
 * Calculates IRS Schedule SE self-employment tax.
 * Follows official IRS statutory rules:
 * 1. Statutory factor 92.35% of net profit
 * 2. Threshold: Net profit must be >= $400 (40,000 cents)
 * 3. Social Security tax: 12.4% on earnings up to the annual Social Security Wage Base Cap
 *    (Taking into account prior W-2 wages that already paid into Social Security).
 * 4. Medicare tax: 2.9% on all taxable self-employment profit.
 * 5. Deductible half: 50% of SE tax deducted above the line from total gross income.
 */
export function calculateSelfEmploymentTax(
  taxYear: TaxYear,
  grossEarningsCents: number,
  businessExpensesCents: number,
  w2WagesCents: number = 0
): SelfEmploymentTaxOutput {
  const rules = getTaxRules(taxYear);
  const seRules = rules.selfEmployment;

  const netProfitCents = Math.max(0, grossEarningsCents - businessExpensesCents);

  // If net profit is under $400, no self-employment tax is owed per IRS rules
  if (netProfitCents < 40000) {
    return {
      netSelfEmploymentProfitCents: netProfitCents,
      taxableSelfEmploymentProfitCents: 0,
      socialSecurityTaxCents: 0,
      medicareTaxCents: 0,
      totalSelfEmploymentTaxCents: 0,
      deductibleHalfCents: 0,
    };
  }

  // Statutory taxable SE profit: 92.35% of net profit
  const taxableProfitCents = Math.round(netProfitCents * seRules.statutoryNetProfitFactor);

  // Remaining Social Security wage base available after W-2 earnings
  const remainingSocialSecurityCapCents = Math.max(
    0,
    seRules.socialSecurityWageCapCents - w2WagesCents
  );

  const earningsSubjectToSocialSecurity = Math.min(
    taxableProfitCents,
    remainingSocialSecurityCapCents
  );

  const socialSecurityTaxCents = Math.round(
    earningsSubjectToSocialSecurity * seRules.socialSecurityRate
  );

  // Medicare tax is un-capped at basic 2.9%
  const medicareTaxCents = Math.round(taxableProfitCents * seRules.medicareRate);

  const totalSelfEmploymentTaxCents = socialSecurityTaxCents + medicareTaxCents;
  const deductibleHalfCents = Math.round(totalSelfEmploymentTaxCents * seRules.deductibleHalfFactor);

  return {
    netSelfEmploymentProfitCents: netProfitCents,
    taxableSelfEmploymentProfitCents: taxableProfitCents,
    socialSecurityTaxCents,
    medicareTaxCents,
    totalSelfEmploymentTaxCents,
    deductibleHalfCents,
  };
}
