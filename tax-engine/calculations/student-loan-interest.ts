import { TaxFilingStatus, TaxYear } from "../../types/tax";
import { getTaxRules } from "../rules";

export interface StudentLoanDeductionResult {
  interestPaidCents: number;
  eligibleInterestCents: number;
  phaseoutReductionCents: number;
  deductionCents: number;
  isDisallowed: boolean;
  disallowedReason?: string;
}

export interface StudentLoanDeductionInput {
  taxYear: TaxYear;
  filingStatus: TaxFilingStatus;
  interestPaidCents: number;
  magiCents: number; // Modified AGI before student loan interest deduction
  isTaxpayerDependent?: boolean;
}

/**
 * Deterministically computes the Above-the-Line Student Loan Interest Deduction under IRC § 221.
 *
 * Rules:
 * 1. Statutory maximum is $2,500 (250,000 cents) of qualified student loan interest paid.
 * 2. Married Filing Separately (MFS) is statutory disallowed under IRC § 221(f)(1).
 * 3. An individual claimed as a dependent cannot claim the deduction under IRC § 221(c).
 * 4. Phased out ratably for higher earners over statutory MAGI phaseout windows:
 *    - 2023: Single $75k-$90k ($15k window), MFJ $155k-$185k ($30k window)
 *    - 2024: Single $80k-$95k ($15k window), MFJ $165k-$195k ($30k window)
 *    - 2025: Single $85k-$100k ($15k window), MFJ $170k-$200k ($30k window)
 *    - 2026: Single $90k-$105k ($15k window), MFJ $175k-$205k ($30k window)
 */
export function calculateStudentLoanInterestDeduction(
  input: StudentLoanDeductionInput
): StudentLoanDeductionResult {
  const { taxYear, filingStatus, interestPaidCents, magiCents, isTaxpayerDependent } = input;

  if (!interestPaidCents || interestPaidCents <= 0) {
    return {
      interestPaidCents: 0,
      eligibleInterestCents: 0,
      phaseoutReductionCents: 0,
      deductionCents: 0,
      isDisallowed: false,
    };
  }

  // Dependent disallowance (IRC § 221(c))
  if (isTaxpayerDependent === true) {
    return {
      interestPaidCents,
      eligibleInterestCents: 0,
      phaseoutReductionCents: 0,
      deductionCents: 0,
      isDisallowed: true,
      disallowedReason: "Taxpayers claimed as dependents are not eligible to claim student loan interest.",
    };
  }

  // MFS disallowance (IRC § 221(f)(1))
  if (filingStatus === "married_filing_separately") {
    return {
      interestPaidCents,
      eligibleInterestCents: 0,
      phaseoutReductionCents: 0,
      deductionCents: 0,
      isDisallowed: true,
      disallowedReason: "Married filing separately taxpayers are not eligible to claim student loan interest.",
    };
  }

  const rules = getTaxRules(taxYear);
  const sliRules = rules.studentLoanInterest;

  const maxCapCents = sliRules?.maxDeductionCents ?? 250000;
  const eligibleInterestCents = Math.min(interestPaidCents, maxCapCents);

  const phaseoutThresholdCents = sliRules?.phaseoutThresholdCents[filingStatus] ?? 8500000;
  const phaseoutRangeCents = sliRules?.phaseoutRangeCents[filingStatus] ?? 1500000;

  // Below phaseout threshold: full eligible amount
  if (magiCents <= phaseoutThresholdCents || phaseoutRangeCents <= 0) {
    return {
      interestPaidCents,
      eligibleInterestCents,
      phaseoutReductionCents: 0,
      deductionCents: eligibleInterestCents,
      isDisallowed: false,
    };
  }

  // Above phaseout ceiling: completely phased out
  const phaseoutCeilingCents = phaseoutThresholdCents + phaseoutRangeCents;
  if (magiCents >= phaseoutCeilingCents) {
    return {
      interestPaidCents,
      eligibleInterestCents,
      phaseoutReductionCents: eligibleInterestCents,
      deductionCents: 0,
      isDisallowed: false,
      disallowedReason: "Deduction completely phased out due to MAGI exceeding the statutory limit.",
    };
  }

  // In phaseout window: ratable reduction
  const excessCents = magiCents - phaseoutThresholdCents;
  const reductionFraction = excessCents / phaseoutRangeCents;
  const phaseoutReductionCents = Math.round(eligibleInterestCents * reductionFraction);
  const deductionCents = Math.max(0, eligibleInterestCents - phaseoutReductionCents);

  return {
    interestPaidCents,
    eligibleInterestCents,
    phaseoutReductionCents,
    deductionCents,
    isDisallowed: false,
  };
}
