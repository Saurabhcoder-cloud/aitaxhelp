import { TaxFilingStatus, TaxYear, TaxCreditsBreakdown, DependentInput } from "@/types/tax";
import { getTaxRules } from "../rules";
import { ChildCareCreditRules } from "../types";

/**
 * Calculates taxpayer age as of December 31 of the tax year from YYYY-MM-DD.
 */
export function calculateAgeAtTaxYearEnd(dateOfBirth: string, taxYear: TaxYear): number {
  if (!dateOfBirth) return 0;
  const parts = dateOfBirth.split("-");
  if (parts.length < 3) return 0;
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return 0;
  return Math.max(0, taxYear - birthYear);
}

const QUALIFYING_CHILD_RELATIONSHIPS = [
  "child",
  "son",
  "daughter",
  "stepchild",
  "foster_child",
  "sibling",
  "brother",
  "sister",
  "half_brother",
  "half_sister",
  "stepbrother",
  "stepsister",
  "grandchild",
  "niece",
  "nephew",
];

function isQualifyingChildRel(rel: string): boolean {
  const r = (rel || "").toLowerCase();
  return QUALIFYING_CHILD_RELATIONSHIPS.some((q) => r.includes(q));
}

/**
 * Evaluates whether a dependent satisfies qualifying child criteria under IRC § 152(c) / § 24(c).
 */
export function isQualifyingChildForCtc(dependent: DependentInput, taxYear: TaxYear): boolean {
  if (dependent.claimedByOtherTaxpayer === true) {
    return false;
  }
  if (dependent.providedMoreThanHalfOwnSupport === true) {
    return false;
  }
  // Must live with taxpayer more than half the year (at least 6 months)
  const monthsLived = dependent.monthsLivedWithTaxpayer ?? 12;
  if (monthsLived < 6) {
    return false;
  }

  if (!isQualifyingChildRel(dependent.relationship)) {
    return false;
  }

  // Must be under 17 at close of calendar year per IRC § 24(c)(1)
  const age = calculateAgeAtTaxYearEnd(dependent.dateOfBirth, taxYear);
  return age < 17;
}

/**
 * Evaluates whether a dependent qualifies for Credit for Other Dependents ($500) under IRC § 24(h)(4).
 */
export function isQualifyingOtherDependent(dependent: DependentInput, taxYear: TaxYear): boolean {
  if (dependent.claimedByOtherTaxpayer === true) {
    return false;
  }
  if (dependent.providedMoreThanHalfOwnSupport === true) {
    return false;
  }
  // If already a qualifying child for CTC, they do not get ODC
  if (isQualifyingChildForCtc(dependent, taxYear)) {
    return false;
  }

  const age = calculateAgeAtTaxYearEnd(dependent.dateOfBirth, taxYear);
  const monthsLived = dependent.monthsLivedWithTaxpayer ?? 12;

  // Case 1: Older child (17-18, or full-time student under 24, or permanently disabled)
  if (isQualifyingChildRel(dependent.relationship)) {
    if (dependent.isPermanentlyDisabled) return true;
    if (age <= 18 && monthsLived >= 6) return true;
    if (dependent.isFullTimeStudent && age < 24 && monthsLived >= 6) return true;
  }

  // Case 2: Parent or other eligible relative
  return true;
}

/**
 * Evaluates whether a dependent is a qualifying person for Child and Dependent Care Credit (IRC § 21).
 * Must be under age 13 or permanently disabled.
 */
export function isQualifyingPersonForCdctc(dependent: DependentInput, taxYear: TaxYear): boolean {
  if (dependent.claimedByOtherTaxpayer === true) return false;
  if (dependent.isPermanentlyDisabled) return true;
  const age = calculateAgeAtTaxYearEnd(dependent.dateOfBirth, taxYear);
  return age < 13;
}

/**
 * Computes the statutory CDCTC percentage rate based on AGI tiers under IRC § 21(a)(2).
 */
export function calculateCdctcRate(agiCents: number, rules: ChildCareCreditRules): number {
  if (agiCents <= rules.agiBaseThresholdCents) {
    return rules.baseRate;
  }
  const excessCents = agiCents - rules.agiBaseThresholdCents;
  const steps = Math.ceil(excessCents / rules.agiStepCents);
  const reducedRate = rules.baseRate - steps * rules.stepRateReduction;
  return Math.max(rules.minRate, Math.round(reducedRate * 100) / 100);
}

/**
 * Counts qualifying children for EITC (under 19, or under 24 student, or permanently disabled).
 */
export function countEitcQualifyingChildren(dependents: DependentInput[], taxYear: TaxYear): number {
  return dependents.filter((dep) => {
    if (dep.claimedByOtherTaxpayer === true) return false;
    if (dep.providedMoreThanHalfOwnSupport === true) return false;
    const monthsLived = dep.monthsLivedWithTaxpayer ?? 12;
    if (monthsLived < 6) return false;

    if (!isQualifyingChildRel(dep.relationship)) return false;

    if (dep.isPermanentlyDisabled) return true;
    const age = calculateAgeAtTaxYearEnd(dep.dateOfBirth, taxYear);
    if (age < 19) return true;
    if (dep.isFullTimeStudent && age < 24) return true;
    return false;
  }).length;
}

export interface CalculateCreditsParams {
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  agiCents?: number;
  adjustedGrossIncomeCents?: number;
  earnedIncomeCents: number;
  taxBeforeCreditsCents?: number;
  tentativeTaxCents?: number;
  dependents?: DependentInput[];
  options?: {
    investmentIncomeCents?: number;
    taxpayerAge?: number;
    childCareExpensesCents?: number;
    qualifyingCarePersonsCount?: number;
    spouseEarnedIncomeCents?: number;
  };
  investmentIncomeCents?: number;
  taxpayerAge?: number;
  childCareExpensesCents?: number;
  qualifyingCarePersonsCount?: number;
  spouseEarnedIncomeCents?: number;
}

/**
 * Deterministically calculates family tax credits (CTC, ODC, CDCTC, ACTC, EITC) in integer cents.
 * Strictly adheres to IRS statutory rules without floating point precision errors.
 */
export function calculateCredits(
  params: CalculateCreditsParams,
  rulesOrOptions?: unknown
): TaxCreditsBreakdown;
export function calculateCredits(
  taxYear: TaxYear,
  filingStatus: TaxFilingStatus,
  adjustedGrossIncomeCents: number,
  earnedIncomeCents: number,
  taxBeforeCreditsCents: number,
  dependents?: DependentInput[],
  options?: {
    investmentIncomeCents?: number;
    taxpayerAge?: number;
    childCareExpensesCents?: number;
    qualifyingCarePersonsCount?: number;
    spouseEarnedIncomeCents?: number;
  }
): TaxCreditsBreakdown;
export function calculateCredits(
  taxYearOrParams: TaxYear | CalculateCreditsParams,
  filingStatusOrRules?: TaxFilingStatus | unknown,
  adjustedGrossIncomeCents?: number,
  earnedIncomeCents?: number,
  taxBeforeCreditsCents?: number,
  dependents: DependentInput[] = [],
  options: {
    investmentIncomeCents?: number;
    taxpayerAge?: number;
    childCareExpensesCents?: number;
    qualifyingCarePersonsCount?: number;
    spouseEarnedIncomeCents?: number;
  } = {}
): TaxCreditsBreakdown {
  if (typeof taxYearOrParams === "object" && taxYearOrParams !== null) {
    const p = taxYearOrParams;
    const year = p.taxYear;
    const status = p.filingStatus;
    const agi = p.agiCents ?? p.adjustedGrossIncomeCents ?? 0;
    const earned = p.earnedIncomeCents ?? 0;
    const taxBefore = p.taxBeforeCreditsCents ?? p.tentativeTaxCents ?? 0;
    const deps = p.dependents ?? [];
    const opts = p.options ?? {
      investmentIncomeCents: p.investmentIncomeCents,
      taxpayerAge: p.taxpayerAge,
      childCareExpensesCents: p.childCareExpensesCents,
      qualifyingCarePersonsCount: p.qualifyingCarePersonsCount,
      spouseEarnedIncomeCents: p.spouseEarnedIncomeCents,
    };
    return calculateCreditsInternal(year, status, agi, earned, taxBefore, deps, opts);
  }

  return calculateCreditsInternal(
    taxYearOrParams as TaxYear,
    filingStatusOrRules as TaxFilingStatus,
    adjustedGrossIncomeCents ?? 0,
    earnedIncomeCents ?? 0,
    taxBeforeCreditsCents ?? 0,
    dependents,
    options
  );
}

function calculateCreditsInternal(
  taxYear: TaxYear,
  filingStatus: TaxFilingStatus,
  adjustedGrossIncomeCents: number,
  earnedIncomeCents: number,
  taxBeforeCreditsCents: number,
  dependents: DependentInput[] = [],
  options: {
    investmentIncomeCents?: number;
    taxpayerAge?: number;
    childCareExpensesCents?: number;
    qualifyingCarePersonsCount?: number;
    spouseEarnedIncomeCents?: number;
  } = {}
): TaxCreditsBreakdown {
  const rules = getTaxRules(taxYear);
  const creditRules = rules.credits;

  if (!creditRules) {
    return {
      childTaxCreditCents: 0,
      creditForOtherDependentsCents: 0,
      totalNonRefundableCreditsCents: 0,
      taxAfterNonRefundableCreditsCents: taxBeforeCreditsCents,
      additionalChildTaxCreditCents: 0,
      earnedIncomeCreditCents: 0,
      totalRefundableCreditsCents: 0,
      totalCreditsCents: 0,
      qualifyingChildrenCount: 0,
      otherDependentsCount: 0,
    };
  }

  // 1. Dependent Classification
  let qualifyingChildrenCount = 0;
  let otherDependentsCount = 0;

  for (const dep of dependents) {
    if (isQualifyingChildForCtc(dep, taxYear)) {
      qualifyingChildrenCount++;
    } else if (isQualifyingOtherDependent(dep, taxYear)) {
      otherDependentsCount++;
    }
  }

  // 2. Tentative CTC and ODC
  const ctcRules = creditRules.childTaxCredit;
  const odcRules = creditRules.creditForOtherDependents;

  const rawCtcCents = qualifyingChildrenCount * ctcRules.maxCreditPerChildCents;
  const rawOdcCents = otherDependentsCount * odcRules.maxCreditPerDependentCents;
  const totalTentativeCreditsCents = rawCtcCents + rawOdcCents;

  // 3. AGI Phaseout (IRC § 24(b))
  // $50 reduction per $1,000 (or fraction thereof) above threshold
  const phaseoutThresholdCents = ctcRules.phaseoutThresholdCents[filingStatus] ?? 20000000;
  let reductionCents = 0;

  if (adjustedGrossIncomeCents > phaseoutThresholdCents) {
    const excessCents = adjustedGrossIncomeCents - phaseoutThresholdCents;
    const steps = Math.ceil(excessCents / ctcRules.phaseoutStepCents);
    reductionCents = steps * ctcRules.phaseoutReductionCents;
  }

  // Allocate reduction: ODC is phased out first, then CTC
  let effectiveOdcCents = Math.max(0, rawOdcCents - reductionCents);
  const unabsorbedReduction = Math.max(0, reductionCents - rawOdcCents);
  let effectiveCtcCents = Math.max(0, rawCtcCents - unabsorbedReduction);

  // 4. Non-Refundable Allocation (Limited to Tax Before Credits)
  const appliedOdcCents = Math.min(taxBeforeCreditsCents, effectiveOdcCents);
  const remainingTaxLiability1 = Math.max(0, taxBeforeCreditsCents - appliedOdcCents);
  const appliedCtcCents = Math.min(remainingTaxLiability1, effectiveCtcCents);
  const remainingTaxLiability2 = Math.max(0, remainingTaxLiability1 - appliedCtcCents);

  // 4b. Child and Dependent Care Credit (CDCTC - IRC § 21)
  let appliedCdctcCents = 0;
  const cdctcRules = creditRules.childAndDependentCare;
  const rawChildCareExpenses = options.childCareExpensesCents ?? 0;
  let qualifyingCarePersonsCount = 0;

  if (cdctcRules && rawChildCareExpenses > 0) {
    const detectedCareCount = dependents.filter((d) => isQualifyingPersonForCdctc(d, taxYear)).length;
    qualifyingCarePersonsCount =
      options.qualifyingCarePersonsCount !== undefined
        ? options.qualifyingCarePersonsCount
        : detectedCareCount;

    if (
      qualifyingCarePersonsCount > 0 &&
      !(cdctcRules.disallowedForMfs && filingStatus === "married_filing_separately")
    ) {
      const maxExpenseLimitCents =
        qualifyingCarePersonsCount === 1
          ? cdctcRules.maxExpensesOnePersonCents
          : cdctcRules.maxExpensesTwoOrMoreCents;

      let earnedIncomeCapCents = earnedIncomeCents;
      if (filingStatus === "married_filing_jointly" && options.spouseEarnedIncomeCents !== undefined) {
        earnedIncomeCapCents = Math.min(earnedIncomeCents, options.spouseEarnedIncomeCents);
      }

      const allowableExpensesCents = Math.min(
        rawChildCareExpenses,
        maxExpenseLimitCents,
        Math.max(0, earnedIncomeCapCents)
      );

      const applicableRate = calculateCdctcRate(adjustedGrossIncomeCents, cdctcRules);
      const tentativeCdctcCents = Math.round(allowableExpensesCents * applicableRate);

      appliedCdctcCents = Math.min(remainingTaxLiability2, tentativeCdctcCents);
    }
  }

  const totalNonRefundableCreditsCents = appliedOdcCents + appliedCtcCents + appliedCdctcCents;
  const taxAfterNonRefundableCreditsCents = Math.max(0, taxBeforeCreditsCents - totalNonRefundableCreditsCents);

  // 5. Additional Child Tax Credit (ACTC - Refundable CTC under IRC § 24(d))
  // Limited to the lesser of:
  // a) Remaining unused Child Tax Credit up to $1,700 per qualifying child
  // b) 15% of earned income in excess of $2,500
  let additionalChildTaxCreditCents = 0;
  const unusedCtcCents = effectiveCtcCents - appliedCtcCents;

  if (unusedCtcCents > 0 && qualifyingChildrenCount > 0) {
    const maxRefundableCapCents = qualifyingChildrenCount * ctcRules.maxRefundableActcCents;
    const availableActcCents = Math.min(unusedCtcCents, maxRefundableCapCents);

    const earnedIncomeExcess = Math.max(0, earnedIncomeCents - ctcRules.actcEarnedIncomeThresholdCents);
    const earnedIncomeLimitCents = Math.round(earnedIncomeExcess * ctcRules.actcRate);

    additionalChildTaxCreditCents = Math.min(availableActcCents, earnedIncomeLimitCents);
  }

  // 6. Earned Income Tax Credit (EITC - Refundable under IRC § 32)
  let earnedIncomeCreditCents = 0;
  const eitcRules = creditRules.earnedIncomeCredit;

  const isMfsDisqualified = eitcRules.disallowedForMfs && filingStatus === "married_filing_separately";
  const isInvestmentDisqualified = (options.investmentIncomeCents ?? 0) > eitcRules.investmentIncomeLimitCents;

  if (!isMfsDisqualified && !isInvestmentDisqualified && earnedIncomeCents > 0) {
    const rawEitcChildren = countEitcQualifyingChildren(dependents, taxYear);
    const eitcChildrenTier = Math.min(3, rawEitcChildren) as 0 | 1 | 2 | 3;

    // Age check for childless workers: generally 25-64
    let isChildlessEligible = true;
    if (eitcChildrenTier === 0 && options.taxpayerAge !== undefined) {
      isChildlessEligible = options.taxpayerAge >= 25 && options.taxpayerAge < 65;
    }

    if (isChildlessEligible) {
      const tier = eitcRules.tiers[eitcChildrenTier];
      const phaseInCreditCents = Math.min(
        Math.round(earnedIncomeCents * tier.phaseInRate),
        tier.maxCreditCents
      );

      // Phase-out is based on greater of earned income or AGI
      const incomeForPhaseoutCents = Math.max(earnedIncomeCents, adjustedGrossIncomeCents);
      const phaseoutThreshold =
        filingStatus === "married_filing_jointly"
          ? tier.phaseOutThresholdMfjCents
          : tier.phaseOutThresholdSingleCents;

      let phaseoutReductionCents = 0;
      if (incomeForPhaseoutCents > phaseoutThreshold) {
        const phaseoutExcess = incomeForPhaseoutCents - phaseoutThreshold;
        phaseoutReductionCents = Math.round(phaseoutExcess * tier.phaseOutRate);
      }

      earnedIncomeCreditCents = Math.max(0, phaseInCreditCents - phaseoutReductionCents);
    }
  }

  const totalRefundableCreditsCents = additionalChildTaxCreditCents + earnedIncomeCreditCents;
  const totalCreditsCents = totalNonRefundableCreditsCents + totalRefundableCreditsCents;

  return {
    childTaxCreditCents: appliedCtcCents,
    creditForOtherDependentsCents: appliedOdcCents,
    childAndDependentCareCreditCents: appliedCdctcCents,
    totalNonRefundableCreditsCents,
    taxAfterNonRefundableCreditsCents,
    additionalChildTaxCreditCents,
    earnedIncomeCreditCents,
    totalRefundableCreditsCents,
    totalCreditsCents,
    qualifyingChildrenCount,
    otherDependentsCount,
    qualifyingCarePersonsCount,
  };
}
