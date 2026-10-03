/**
 * California State Tax Rules — Tax Year 2026
 *
 * Source Authority:
 * - California Revenue and Taxation Code (RTC) §§ 17041, 17054, 17052, 17052.1, 17073.5
 * - Statutory annual indexation per California Consumer Price Index (CCPI) adjustment factor
 *
 * ARCHITECTURAL INVARIANT:
 * All monetary amounts are integer cents.
 * Calculation is completely deterministic with zero floating point accumulation.
 */

import { CaliforniaRuleSet, CaliforniaTaxBracket } from "./types";
import { TaxFilingStatus } from "@/types/tax";

// Single / Married Filing Separately Brackets (RTC § 17041(a) indexed ~2.5%)
const SINGLE_BRACKETS_2026: CaliforniaTaxBracket[] = [
  { floorCents: 0, ceilingCents: 1102500, rate: 0.01, baseTaxCents: 0 },
  { floorCents: 1102500, ceilingCents: 2613600, rate: 0.02, baseTaxCents: 11025 },
  { floorCents: 2613600, ceilingCents: 4125100, rate: 0.04, baseTaxCents: 41247 },
  { floorCents: 4125100, ceilingCents: 5719800, rate: 0.06, baseTaxCents: 101707 },
  { floorCents: 5719800, ceilingCents: 7230600, rate: 0.08, baseTaxCents: 197389 },
  { floorCents: 7230600, ceilingCents: 36967500, rate: 0.093, baseTaxCents: 318253 },
  { floorCents: 36967500, ceilingCents: 44361000, rate: 0.103, baseTaxCents: 3083785 },
  { floorCents: 44361000, ceilingCents: 73934700, rate: 0.113, baseTaxCents: 3845315 },
  { floorCents: 73934700, ceilingCents: null, rate: 0.123, baseTaxCents: 7187143 },
];

// Married Filing Jointly / Qualifying Surviving Spouse Brackets (RTC § 17041(b))
const JOINT_BRACKETS_2026: CaliforniaTaxBracket[] = [
  { floorCents: 0, ceilingCents: 2205000, rate: 0.01, baseTaxCents: 0 },
  { floorCents: 2205000, ceilingCents: 5227200, rate: 0.02, baseTaxCents: 22050 },
  { floorCents: 5227200, ceilingCents: 8250200, rate: 0.04, baseTaxCents: 82494 },
  { floorCents: 8250200, ceilingCents: 11439600, rate: 0.06, baseTaxCents: 203414 },
  { floorCents: 11439600, ceilingCents: 14461200, rate: 0.08, baseTaxCents: 394778 },
  { floorCents: 14461200, ceilingCents: 73935000, rate: 0.093, baseTaxCents: 636506 },
  { floorCents: 73935000, ceilingCents: 88722000, rate: 0.103, baseTaxCents: 6167570 },
  { floorCents: 88722000, ceilingCents: 147869400, rate: 0.113, baseTaxCents: 7690631 },
  { floorCents: 147869400, ceilingCents: null, rate: 0.123, baseTaxCents: 14374286 },
];

// Head of Household Brackets (RTC § 17041(c))
const HOH_BRACKETS_2026: CaliforniaTaxBracket[] = [
  { floorCents: 0, ceilingCents: 2206500, rate: 0.01, baseTaxCents: 0 },
  { floorCents: 2206500, ceilingCents: 5227400, rate: 0.02, baseTaxCents: 22065 },
  { floorCents: 5227400, ceilingCents: 6738800, rate: 0.04, baseTaxCents: 82483 },
  { floorCents: 6738800, ceilingCents: 8333700, rate: 0.06, baseTaxCents: 142939 },
  { floorCents: 8333700, ceilingCents: 9844400, rate: 0.08, baseTaxCents: 238633 },
  { floorCents: 9844400, ceilingCents: 50275800, rate: 0.093, baseTaxCents: 359489 },
  { floorCents: 50275800, ceilingCents: 60331000, rate: 0.103, baseTaxCents: 4119609 },
  { floorCents: 60331000, ceilingCents: 100551200, rate: 0.113, baseTaxCents: 5155295 },
  { floorCents: 100551200, ceilingCents: null, rate: 0.123, baseTaxCents: 9700178 },
];

export const CALIFORNIA_RULES_2026: CaliforniaRuleSet = {
  taxYear: 2026,
  rulesVersion: "2026.1-ftb-statutory",
  brackets: {
    single: SINGLE_BRACKETS_2026,
    married_filing_jointly: JOINT_BRACKETS_2026,
    married_filing_separately: SINGLE_BRACKETS_2026,
    head_of_household: HOH_BRACKETS_2026,
    qualifying_surviving_spouse: JOINT_BRACKETS_2026,
  },
  // Proposition 63 Mental Health Services Tax: 1% surtax on taxable income over $1,000,000 (unindexed)
  mentalHealthSurtaxThresholdCents: 100000000, // $1,000,000.00
  mentalHealthSurtaxRate: 0.01,
  standardDeductions: {
    singleCents: 568000, // $5,680.00
    marriedFilingJointlyCents: 1136000, // $11,360.00
    marriedFilingSeparatelyCents: 568000, // $5,680.00
    headOfHouseholdCents: 1136000, // $11,360.00
    qualifyingSurvivingSpouseCents: 1136000, // $11,360.00
  },
  exemptionCredits: {
    personalSingleCents: 15300, // $153.00
    personalMarriedJointCents: 30600, // $306.00 ($153 x 2)
    personalHeadOfHouseholdCents: 15300, // $153.00
    personalMarriedSeparateCents: 15300, // $153.00
    personalSurvivingSpouseCents: 30600, // $306.00
    dependentCreditCents: 46800, // $468.00 per qualifying dependent
    phaseoutThresholdSingleCents: 25549300, // $255,493.00
    phaseoutThresholdJointCents: 51099000, // $510,990.00
    phaseoutThresholdHohCents: 38324300, // $383,243.00
    phaseoutStepCents: 250000, // $2,500.00 increment
    phaseoutRatePercent: 0.06, // $6 reduction per step per credit
  },
  calEitc: {
    maxEarnedIncomeCents: 3233900, // $32,339.00
    maxCreditZeroChildrenCents: 30800, // $308.00
    maxCreditOneChildCents: 205000, // $2,050.00
    maxCreditTwoChildrenCents: 339300, // $3,393.00
    maxCreditThreePlusChildrenCents: 382300, // $3,823.00
    phaseInRateZeroChildren: 0.06,
    phaseInRateOneChild: 0.25,
    phaseInRateTwoChildren: 0.40,
    phaseInRateThreePlusChildren: 0.45,
    phaseOutRateZeroChildren: 0.02,
    phaseOutRateOneChild: 0.10,
    phaseOutRateTwoChildren: 0.15,
    phaseOutRateThreePlusChildren: 0.17,
    phaseOutThresholdZeroChildrenCents: 768800, // $7,688.00
    phaseOutThresholdWithChildrenCents: 1230000, // $12,300.00
  },
  youngChildTaxCredit: {
    maxCreditCents: 114500, // $1,145.00
    maxIncomeCents: 3233900, // $32,339.00
  },
};
