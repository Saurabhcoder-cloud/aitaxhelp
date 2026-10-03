/**
 * California State Tax Rules — Tax Year 2025
 *
 * Source Authority:
 * - California Revenue and Taxation Code (RTC) §§ 17041, 17054, 17052, 17052.1, 17073.5
 * - California Franchise Tax Board (FTB) 2025 Form 540 / 540NR Tax Rates and Exemption Schedules
 *
 * ARCHITECTURAL INVARIANT:
 * All monetary amounts are integer cents.
 * Calculation is completely deterministic with zero floating point accumulation.
 */

import { CaliforniaRuleSet, CaliforniaTaxBracket } from "./types";
import { TaxFilingStatus } from "@/types/tax";

// Single / Married Filing Separately Brackets (RTC § 17041(a))
const SINGLE_BRACKETS_2025: CaliforniaTaxBracket[] = [
  { floorCents: 0, ceilingCents: 1075600, rate: 0.01, baseTaxCents: 0 },
  { floorCents: 1075600, ceilingCents: 2549900, rate: 0.02, baseTaxCents: 10756 },
  { floorCents: 2549900, ceilingCents: 4024500, rate: 0.04, baseTaxCents: 40242 },
  { floorCents: 4024500, ceilingCents: 5580300, rate: 0.06, baseTaxCents: 99226 },
  { floorCents: 5580300, ceilingCents: 7054200, rate: 0.08, baseTaxCents: 192574 },
  { floorCents: 7054200, ceilingCents: 36065900, rate: 0.093, baseTaxCents: 310486 },
  { floorCents: 36065900, ceilingCents: 43279000, rate: 0.103, baseTaxCents: 3008574 },
  { floorCents: 43279000, ceilingCents: 72131400, rate: 0.113, baseTaxCents: 3751523 },
  { floorCents: 72131400, ceilingCents: null, rate: 0.123, baseTaxCents: 7011844 },
];

// Married Filing Jointly / Qualifying Surviving Spouse Brackets (RTC § 17041(b))
// Exactly double the single bracket amounts
const JOINT_BRACKETS_2025: CaliforniaTaxBracket[] = [
  { floorCents: 0, ceilingCents: 2151200, rate: 0.01, baseTaxCents: 0 },
  { floorCents: 2151200, ceilingCents: 5099800, rate: 0.02, baseTaxCents: 21512 },
  { floorCents: 5099800, ceilingCents: 8049000, rate: 0.04, baseTaxCents: 80484 },
  { floorCents: 8049000, ceilingCents: 11160600, rate: 0.06, baseTaxCents: 198452 },
  { floorCents: 11160600, ceilingCents: 14108400, rate: 0.08, baseTaxCents: 385148 },
  { floorCents: 14108400, ceilingCents: 72131800, rate: 0.093, baseTaxCents: 620972 },
  { floorCents: 72131800, ceilingCents: 86558000, rate: 0.103, baseTaxCents: 6017148 },
  { floorCents: 86558000, ceilingCents: 144262800, rate: 0.113, baseTaxCents: 7503046 },
  { floorCents: 144262800, ceilingCents: null, rate: 0.123, baseTaxCents: 14023688 },
];

// Head of Household Brackets (RTC § 17041(c))
const HOH_BRACKETS_2025: CaliforniaTaxBracket[] = [
  { floorCents: 0, ceilingCents: 2152700, rate: 0.01, baseTaxCents: 0 },
  { floorCents: 2152700, ceilingCents: 5099900, rate: 0.02, baseTaxCents: 21527 },
  { floorCents: 5099900, ceilingCents: 6574400, rate: 0.04, baseTaxCents: 80471 },
  { floorCents: 6574400, ceilingCents: 8130400, rate: 0.06, baseTaxCents: 139451 },
  { floorCents: 8130400, ceilingCents: 9604300, rate: 0.08, baseTaxCents: 232811 },
  { floorCents: 9604300, ceilingCents: 49049600, rate: 0.093, baseTaxCents: 350723 },
  { floorCents: 49049600, ceilingCents: 58859500, rate: 0.103, baseTaxCents: 4019138 },
  { floorCents: 58859500, ceilingCents: 98098700, rate: 0.113, baseTaxCents: 5029558 },
  { floorCents: 98098700, ceilingCents: null, rate: 0.123, baseTaxCents: 9463588 },
];

export const CALIFORNIA_RULES_2025: CaliforniaRuleSet = {
  taxYear: 2025,
  rulesVersion: "2025.1-ftb-statutory",
  brackets: {
    single: SINGLE_BRACKETS_2025,
    married_filing_jointly: JOINT_BRACKETS_2025,
    married_filing_separately: SINGLE_BRACKETS_2025,
    head_of_household: HOH_BRACKETS_2025,
    qualifying_surviving_spouse: JOINT_BRACKETS_2025,
  },
  // Proposition 63 Mental Health Services Tax: 1% surtax on taxable income over $1,000,000
  mentalHealthSurtaxThresholdCents: 100000000, // $1,000,000.00
  mentalHealthSurtaxRate: 0.01,
  standardDeductions: {
    singleCents: 554000, // $5,540.00
    marriedFilingJointlyCents: 1108000, // $11,080.00
    marriedFilingSeparatelyCents: 554000, // $5,540.00
    headOfHouseholdCents: 1108000, // $11,080.00
    qualifyingSurvivingSpouseCents: 1108000, // $11,080.00
  },
  exemptionCredits: {
    personalSingleCents: 14900, // $149.00
    personalMarriedJointCents: 29800, // $298.00 ($149 x 2)
    personalHeadOfHouseholdCents: 14900, // $149.00
    personalMarriedSeparateCents: 14900, // $149.00
    personalSurvivingSpouseCents: 29800, // $298.00
    dependentCreditCents: 45600, // $456.00 per qualifying dependent
    phaseoutThresholdSingleCents: 24926100, // $249,261.00
    phaseoutThresholdJointCents: 49852700, // $498,527.00
    phaseoutThresholdHohCents: 37389600, // $373,896.00
    phaseoutStepCents: 250000, // $2,500.00 increment
    phaseoutRatePercent: 0.06, // $6 reduction per step per credit
  },
  calEitc: {
    maxEarnedIncomeCents: 3155000, // $31,550.00
    maxCreditZeroChildrenCents: 30000, // $300.00
    maxCreditOneChildCents: 200000, // $2,000.00
    maxCreditTwoChildrenCents: 331000, // $3,310.00
    maxCreditThreePlusChildrenCents: 373000, // $3,730.00
    phaseInRateZeroChildren: 0.06,
    phaseInRateOneChild: 0.25,
    phaseInRateTwoChildren: 0.40,
    phaseInRateThreePlusChildren: 0.45,
    phaseOutRateZeroChildren: 0.02,
    phaseOutRateOneChild: 0.10,
    phaseOutRateTwoChildren: 0.15,
    phaseOutRateThreePlusChildren: 0.17,
    phaseOutThresholdZeroChildrenCents: 750000, // $7,500.00
    phaseOutThresholdWithChildrenCents: 1200000, // $12,000.00
  },
  youngChildTaxCredit: {
    maxCreditCents: 111700, // $1,117.00
    maxIncomeCents: 3155000, // $31,550.00
  },
};
