import { TaxFilingStatus, TaxYear, TaxWarning } from "../../types/tax";
import { getTaxRules } from "../rules";

export interface DeductionResolution {
  deductionUsedCents: number;
  deductionType: "standard";
  standardDeductionCents: number;
  warning?: TaxWarning;
}

/**
 * Resolves the deduction for the taxpayer.
 * In this baseline, the engine strictly calculates the official IRS standard deduction.
 * If unsupported itemized deduction amounts are supplied, an explicit structured
 * warning is emitted, and the standard deduction is applied.
 */
export function resolveDeductions(
  taxYear: TaxYear,
  filingStatus: TaxFilingStatus,
  itemizedDeductionCents: number = 0
): DeductionResolution {
  const rules = getTaxRules(taxYear);
  const standardDeductionCents = rules.standardDeductions[filingStatus];

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
