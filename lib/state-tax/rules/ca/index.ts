/**
 * California State Tax Rule Resolver & Calculator — Phase 11
 *
 * Provides deterministic mathematical calculation of California income tax,
 * mental health surtax, standard deduction, exemption credits, CalEITC, and YCTC.
 *
 * ARCHITECTURAL INVARIANT:
 * - Deterministic integer-cents arithmetic.
 * - Zero LLM or client overrides.
 * - Source authority: California RTC & FTB schedules.
 */

import { AppError } from "@/lib/utils/errors";
import { TaxFilingStatus, TaxYear } from "@/types/tax";
import { CaliforniaRuleSet } from "./types";
import { CALIFORNIA_RULES_2025 } from "./2025";
import { CALIFORNIA_RULES_2026 } from "./2026";

export function getCaliforniaRules(taxYear: TaxYear | number): CaliforniaRuleSet {
  if (taxYear === 2025) {
    return CALIFORNIA_RULES_2025;
  }
  if (taxYear === 2026) {
    return CALIFORNIA_RULES_2026;
  }
  throw new AppError(
    `California statutory tax rules are not available for tax year ${taxYear}. Supported tax years: 2025, 2026.`,
    422,
    "STATE_RULES_UNAVAILABLE"
  );
}

/**
 * Computes standard deduction for California based on filing status.
 */
export function calculateCaliforniaStandardDeduction(
  filingStatus: TaxFilingStatus,
  rules: CaliforniaRuleSet
): number {
  switch (filingStatus) {
    case "single":
      return rules.standardDeductions.singleCents;
    case "married_filing_jointly":
      return rules.standardDeductions.marriedFilingJointlyCents;
    case "married_filing_separately":
      return rules.standardDeductions.marriedFilingSeparatelyCents;
    case "head_of_household":
      return rules.standardDeductions.headOfHouseholdCents;
    case "qualifying_surviving_spouse":
      return rules.standardDeductions.qualifyingSurvivingSpouseCents;
    default:
      return rules.standardDeductions.singleCents;
  }
}

/**
 * Computes progressive California state tax and mental health surtax.
 */
export function calculateCaliforniaTaxBrackets(
  taxableIncomeCents: number,
  filingStatus: TaxFilingStatus,
  rules: CaliforniaRuleSet
): {
  grossTaxCents: number;
  mentalHealthTaxCents: number;
  marginalBracket: number;
  effectiveRate: number;
} {
  if (taxableIncomeCents <= 0) {
    return { grossTaxCents: 0, mentalHealthTaxCents: 0, marginalBracket: 0, effectiveRate: 0 };
  }

  const brackets = rules.brackets[filingStatus] || rules.brackets.single;
  let regularTaxCents = 0;
  let marginalRate = 0.01;

  for (const bracket of brackets) {
    if (taxableIncomeCents > bracket.floorCents) {
      marginalRate = bracket.rate;
      const taxableInBracket = bracket.ceilingCents !== null
        ? Math.min(taxableIncomeCents, bracket.ceilingCents) - bracket.floorCents
        : taxableIncomeCents - bracket.floorCents;

      // Deterministic integer rounding for each bracket slice
      const bracketTax = Math.round(taxableInBracket * bracket.rate);
      regularTaxCents = bracket.baseTaxCents + bracketTax;
    }
  }

  // Proposition 63 Mental Health Services Tax: 1% on taxable income > $1,000,000
  let mentalHealthTaxCents = 0;
  if (taxableIncomeCents > rules.mentalHealthSurtaxThresholdCents) {
    const excess = taxableIncomeCents - rules.mentalHealthSurtaxThresholdCents;
    mentalHealthTaxCents = Math.round(excess * rules.mentalHealthSurtaxRate);
  }

  const totalGrossTaxCents = regularTaxCents + mentalHealthTaxCents;
  const effectiveRate = taxableIncomeCents > 0
    ? Number((totalGrossTaxCents / taxableIncomeCents).toFixed(4))
    : 0;

  return {
    grossTaxCents: totalGrossTaxCents,
    mentalHealthTaxCents,
    marginalBracket: marginalRate,
    effectiveRate,
  };
}

/**
 * Computes California Exemption Credits (RTC § 17054) with statutory phaseout.
 */
export function calculateCaliforniaExemptionCredits(
  caAgiCents: number,
  filingStatus: TaxFilingStatus,
  dependentsCount: number,
  rules: CaliforniaRuleSet
): {
  personalExemptionCreditCents: number;
  dependentExemptionCreditCents: number;
  totalExemptionCreditsCents: number;
} {
  const { exemptionCredits } = rules;

  let basePersonalCredit = exemptionCredits.personalSingleCents;
  let phaseoutThreshold = exemptionCredits.phaseoutThresholdSingleCents;

  if (filingStatus === "married_filing_jointly" || filingStatus === "qualifying_surviving_spouse") {
    basePersonalCredit = exemptionCredits.personalMarriedJointCents;
    phaseoutThreshold = exemptionCredits.phaseoutThresholdJointCents;
  } else if (filingStatus === "head_of_household") {
    basePersonalCredit = exemptionCredits.personalHeadOfHouseholdCents;
    phaseoutThreshold = exemptionCredits.phaseoutThresholdHohCents;
  } else if (filingStatus === "married_filing_separately") {
    basePersonalCredit = exemptionCredits.personalMarriedSeparateCents;
    phaseoutThreshold = Math.round(exemptionCredits.phaseoutThresholdJointCents / 2);
  }

  const validDependents = Math.max(0, dependentsCount || 0);
  const baseDependentCredit = validDependents * exemptionCredits.dependentCreditCents;

  // Phaseout calculation: reduction applies when CA AGI exceeds threshold
  let reductionFactor = 0;
  if (caAgiCents > phaseoutThreshold) {
    const excess = caAgiCents - phaseoutThreshold;
    const steps = Math.ceil(excess / exemptionCredits.phaseoutStepCents);
    reductionFactor = steps * exemptionCredits.phaseoutRatePercent;
  }

  const reductionMultiplier = Math.max(0, 1 - reductionFactor);
  const finalPersonal = Math.max(0, Math.round(basePersonalCredit * reductionMultiplier));
  const finalDependent = Math.max(0, Math.round(baseDependentCredit * reductionMultiplier));

  return {
    personalExemptionCreditCents: finalPersonal,
    dependentExemptionCreditCents: finalDependent,
    totalExemptionCreditsCents: finalPersonal + finalDependent,
  };
}

/**
 * Computes California Earned Income Tax Credit (CalEITC, RTC § 17052).
 */
export function calculateCalEitc(
  earnedIncomeCents: number,
  qualifyingChildren: number,
  rules: CaliforniaRuleSet
): number {
  const { calEitc } = rules;

  if (earnedIncomeCents <= 0 || earnedIncomeCents > calEitc.maxEarnedIncomeCents) {
    return 0;
  }

  const children = Math.max(0, Math.min(qualifyingChildren, 3));
  let maxCredit = calEitc.maxCreditZeroChildrenCents;
  let phaseInRate = calEitc.phaseInRateZeroChildren;
  let phaseOutRate = calEitc.phaseOutRateZeroChildren;
  let phaseOutThreshold = calEitc.phaseOutThresholdZeroChildrenCents;

  if (children === 1) {
    maxCredit = calEitc.maxCreditOneChildCents;
    phaseInRate = calEitc.phaseInRateOneChild;
    phaseOutRate = calEitc.phaseOutRateOneChild;
    phaseOutThreshold = calEitc.phaseOutThresholdWithChildrenCents;
  } else if (children === 2) {
    maxCredit = calEitc.maxCreditTwoChildrenCents;
    phaseInRate = calEitc.phaseInRateTwoChildren;
    phaseOutRate = calEitc.phaseOutRateTwoChildren;
    phaseOutThreshold = calEitc.phaseOutThresholdWithChildrenCents;
  } else if (children >= 3) {
    maxCredit = calEitc.maxCreditThreePlusChildrenCents;
    phaseInRate = calEitc.phaseInRateThreePlusChildren;
    phaseOutRate = calEitc.phaseOutRateThreePlusChildren;
    phaseOutThreshold = calEitc.phaseOutThresholdWithChildrenCents;
  }

  // Phase-in
  const phaseInCredit = Math.round(earnedIncomeCents * phaseInRate);
  let tentativeCredit = Math.min(maxCredit, phaseInCredit);

  // Phase-out
  if (earnedIncomeCents > phaseOutThreshold) {
    const excess = earnedIncomeCents - phaseOutThreshold;
    const reduction = Math.round(excess * phaseOutRate);
    tentativeCredit = Math.max(0, tentativeCredit - reduction);
  }

  return tentativeCredit;
}

/**
 * Computes California Young Child Tax Credit (YCTC, RTC § 17052.1).
 * Requires qualifying for CalEITC and having a qualifying child under age 6.
 */
export function calculateYoungChildTaxCredit(
  earnedIncomeCents: number,
  hasUnder6Child: boolean,
  qualifiesForCalEitc: boolean,
  rules: CaliforniaRuleSet
): number {
  if (!hasUnder6Child || !qualifiesForCalEitc) {
    return 0;
  }

  if (earnedIncomeCents <= 0 || earnedIncomeCents > rules.youngChildTaxCredit.maxIncomeCents) {
    return 0;
  }

  return rules.youngChildTaxCredit.maxCreditCents;
}
