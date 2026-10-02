import { TaxFilingStatus, TaxYear, ScheduleAInput, ScheduleABreakdown } from "../../types/tax";
import { getTaxRules } from "../rules";

export interface ItemizedDeductionCalculationResult {
  breakdown: ScheduleABreakdown;
  allowableMedicalCents: number;
  allowableSaltCents: number;
  allowableMortgageInterestCents: number;
  allowableCharitableCents: number;
  totalScheduleACents: number;
  standardDeductionCents: number;
  chosenDeductionType: "standard" | "itemized";
  deductionUsedCents: number;
  itemizedTaxBenefitCents: number; // Difference if itemized > standard, else 0
}

/**
 * Deterministically computes Schedule A Itemized Deductions under IRC rules:
 *
 * 1. Medical and Dental Expenses (IRC § 213(a)):
 *    Deductible only to the extent they exceed 7.5% of AGI.
 * 2. State and Local Taxes (SALT - IRC § 164(b)(6)):
 *    Aggregate of state/local income or sales taxes and real estate/personal property taxes.
 *    Statutory cap: $10,000 ($1,000,000 cents) for Single/MFJ/HOH/QSS; $5,000 ($500,000 cents) for MFS.
 * 3. Mortgage Interest (IRC § 163(h)):
 *    Deductible qualified residence interest.
 * 4. Charitable Contributions (IRC § 170):
 *    Cash gifts capped at statutory 60% of AGI.
 */
export function calculateItemizedDeductions(
  taxYear: TaxYear,
  filingStatus: TaxFilingStatus,
  agiCents: number,
  scheduleA?: ScheduleAInput
): ItemizedDeductionCalculationResult {
  const rules = getTaxRules(taxYear);
  const stdDeductionCents = rules.standardDeductions[filingStatus];
  const itemRules = rules.itemizedDeductions;

  if (!scheduleA) {
    const emptyBreakdown: ScheduleABreakdown = {
      medicalExpensesCents: 0,
      medicalAgiThresholdCents: 0,
      allowableMedicalCents: 0,
      saltTotalClaimedCents: 0,
      saltCapCents: itemRules?.saltCapCents[filingStatus] ?? 1000000,
      allowableSaltCents: 0,
      allowableMortgageInterestCents: 0,
      allowableCharitableCents: 0,
      totalScheduleACents: 0,
    };
    return {
      breakdown: emptyBreakdown,
      allowableMedicalCents: 0,
      allowableSaltCents: 0,
      allowableMortgageInterestCents: 0,
      allowableCharitableCents: 0,
      totalScheduleACents: 0,
      standardDeductionCents: stdDeductionCents,
      chosenDeductionType: "standard",
      deductionUsedCents: stdDeductionCents,
      itemizedTaxBenefitCents: 0,
    };
  }

  // 1. Medical & Dental (7.5% AGI Floor)
  const rawMedicalCents = Math.max(0, scheduleA.medicalExpensesCents ?? 0);
  const medicalFloorRate = itemRules?.medicalAgiFloorRate ?? 0.075;
  const medicalAgiThresholdCents = Math.max(0, Math.round(agiCents * medicalFloorRate));
  const allowableMedicalCents = Math.max(0, rawMedicalCents - medicalAgiThresholdCents);

  // 2. State and Local Taxes (SALT) with Cap
  const rawSaltDirect = scheduleA.saltTaxesCents ?? 0;
  const rawIncomeSales = Math.max(
    0,
    (scheduleA.stateAndLocalIncomeTaxesCents ?? 0) + (scheduleA.stateAndLocalSalesTaxesCents ?? 0)
  );
  const rawPropertyTaxes = Math.max(
    0,
    (scheduleA.realEstatePropertyTaxesCents ?? 0) + (scheduleA.personalPropertyTaxesCents ?? 0)
  );
  const saltTotalClaimedCents = Math.max(0, rawSaltDirect > 0 ? rawSaltDirect : rawIncomeSales + rawPropertyTaxes);

  const saltCapCents = itemRules?.saltCapCents[filingStatus] ?? (filingStatus === "married_filing_separately" ? 500000 : 1000000);
  const allowableSaltCents = Math.min(saltTotalClaimedCents, saltCapCents);

  // 3. Qualified Mortgage Interest
  const allowableMortgageInterestCents = Math.max(0, scheduleA.mortgageInterestCents ?? 0);

  // 4. Charitable Contributions (Cash capped at 60% AGI)
  const rawCashCharity = Math.max(0, scheduleA.charitableCashCents ?? 0);
  const rawNonCashCharity = Math.max(0, scheduleA.charitableNonCashCents ?? 0);
  const charitableAgiLimit = Math.max(0, Math.round(agiCents * (itemRules?.charitableCashAgiLimitRate ?? 0.60)));
  const allowableCashCharity = agiCents > 0 ? Math.min(rawCashCharity, charitableAgiLimit) : rawCashCharity;
  const allowableCharitableCents = allowableCashCharity + rawNonCashCharity;

  // 5. Total Schedule A
  const totalScheduleACents =
    allowableMedicalCents + allowableSaltCents + allowableMortgageInterestCents + allowableCharitableCents;

  const breakdown: ScheduleABreakdown = {
    medicalExpensesCents: rawMedicalCents,
    medicalAgiThresholdCents,
    allowableMedicalCents,
    saltTotalClaimedCents,
    saltCapCents,
    allowableSaltCents,
    allowableMortgageInterestCents,
    allowableCharitableCents,
    totalScheduleACents,
  };

  const isItemizedBetter = totalScheduleACents > stdDeductionCents;
  const chosenDeductionType: "standard" | "itemized" = isItemizedBetter ? "itemized" : "standard";
  const deductionUsedCents = isItemizedBetter ? totalScheduleACents : stdDeductionCents;
  const itemizedTaxBenefitCents = isItemizedBetter ? totalScheduleACents - stdDeductionCents : 0;

  return {
    breakdown,
    allowableMedicalCents,
    allowableSaltCents,
    allowableMortgageInterestCents,
    allowableCharitableCents,
    totalScheduleACents,
    standardDeductionCents: stdDeductionCents,
    chosenDeductionType,
    deductionUsedCents,
    itemizedTaxBenefitCents,
  };
}
