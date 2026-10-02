import { TaxFilingStatus, TaxYear, TaxWarning, ScheduleAInput, ScheduleABreakdown } from "../../types/tax";
import { getTaxRules } from "../rules";
import { calculateItemizedDeductions } from "./itemized-deductions";

export interface DeductionResolution {
  deductionUsedCents: number;
  deductionType: "standard" | "itemized";
  standardDeductionCents: number;
  itemizedBreakdown?: ScheduleABreakdown;
  warning?: TaxWarning;
}

/**
 * Resolves the deduction for the taxpayer.
 *
 * Rules:
 * 1. If structured Schedule A itemized input is provided, the engine deterministically
 *    computes allowable medical (7.5% AGI floor), capped SALT ($10k/$5k), mortgage interest,
 *    and charitable gifts, comparing against the official IRS standard deduction and
 *    applying whichever gives the greater deduction.
 * 2. If unsupported legacy bare itemizedDeductionCents is passed without structured Schedule A,
 *    an explicit structured warning is emitted, and the standard deduction is applied (preserving baseline behavior).
 */
export function resolveDeductions(
  taxYear: TaxYear,
  filingStatus: TaxFilingStatus,
  itemizedDeductionCents: number = 0,
  scheduleA?: ScheduleAInput,
  agiCents: number = 0
): DeductionResolution {
  const rules = getTaxRules(taxYear);
  const standardDeductionCents = rules.standardDeductions[filingStatus];

  // Path 1: Structured Schedule A provided
  if (scheduleA) {
    const itemizedResult = calculateItemizedDeductions(taxYear, filingStatus, agiCents, scheduleA);
    return {
      deductionUsedCents: itemizedResult.deductionUsedCents,
      deductionType: itemizedResult.chosenDeductionType,
      standardDeductionCents,
      itemizedBreakdown: itemizedResult.breakdown,
    };
  }

  // Path 2: Bare legacy itemized deduction passed without Schedule A breakdown
  let warning: TaxWarning | undefined;
  if (itemizedDeductionCents > 0) {
    warning = {
      code: "ITEMIZED_DEDUCTIONS_UNSUPPORTED",
      level: "unsupported",
      message:
        "Complex itemized deductions (Schedule A) are not supported in this baseline version. The official IRS standard deduction was applied.",
    };
  }

  return {
    deductionUsedCents: standardDeductionCents,
    deductionType: "standard",
    standardDeductionCents,
    warning,
  };
}
