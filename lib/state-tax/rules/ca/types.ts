/**
 * California State Tax Rules Domain Types — Phase 11
 *
 * Types for California Franchise Tax Board (FTB) Form 540 / 540NR rules.
 */

import { TaxFilingStatus } from "@/types/tax";

export interface CaliforniaTaxBracket {
  floorCents: number;
  ceilingCents: number | null; // null for top open-ended bracket
  rate: number; // e.g. 0.01 for 1%
  baseTaxCents: number;
}

export interface CaliforniaStandardDeductions {
  singleCents: number;
  marriedFilingJointlyCents: number;
  marriedFilingSeparatelyCents: number;
  headOfHouseholdCents: number;
  qualifyingSurvivingSpouseCents: number;
}

export interface CaliforniaExemptionCredits {
  personalSingleCents: number;
  personalMarriedJointCents: number;
  personalHeadOfHouseholdCents: number;
  personalMarriedSeparateCents: number;
  personalSurvivingSpouseCents: number;
  dependentCreditCents: number;
  phaseoutThresholdSingleCents: number;
  phaseoutThresholdJointCents: number;
  phaseoutThresholdHohCents: number;
  phaseoutStepCents: number; // $2,500
  phaseoutRatePercent: number; // 6 dollars reduction per step
}

export interface CaliforniaEitcParameters {
  maxEarnedIncomeCents: number;
  maxCreditZeroChildrenCents: number;
  maxCreditOneChildCents: number;
  maxCreditTwoChildrenCents: number;
  maxCreditThreePlusChildrenCents: number;
  phaseInRateZeroChildren: number;
  phaseInRateOneChild: number;
  phaseInRateTwoChildren: number;
  phaseInRateThreePlusChildren: number;
  phaseOutRateZeroChildren: number;
  phaseOutRateOneChild: number;
  phaseOutRateTwoChildren: number;
  phaseOutRateThreePlusChildren: number;
  phaseOutThresholdZeroChildrenCents: number;
  phaseOutThresholdWithChildrenCents: number;
}

export interface CaliforniaYctcParameters {
  maxCreditCents: number;
  maxIncomeCents: number;
}

export interface CaliforniaRuleSet {
  taxYear: number;
  rulesVersion: string;
  brackets: Record<TaxFilingStatus, CaliforniaTaxBracket[]>;
  mentalHealthSurtaxThresholdCents: number; // $1,000,000 (100,000,000 cents)
  mentalHealthSurtaxRate: number; // 0.01 (1%)
  standardDeductions: CaliforniaStandardDeductions;
  exemptionCredits: CaliforniaExemptionCredits;
  calEitc: CaliforniaEitcParameters;
  youngChildTaxCredit: CaliforniaYctcParameters;
}
