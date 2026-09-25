import { TaxYearRules } from "../../types";

/**
 * Verified Federal Tax Rules for Tax Year 2026
 *
 * AUTHORITATIVE SOURCES:
 * 1. IRS Revenue Procedure 2025-32 (Issued October 9, 2025; technical revisions Oct 17, 2025)
 *    Under the One, Big, Beautiful Bill Act (OBBBA; P.L. 119-21), making permanent the seven-rate
 *    statutory individual tax structure and adjusting brackets and standard deductions for inflation.
 * 2. Social Security Administration (SSA) Fact Sheet: 2026 Social Security Changes
 *    Establishing the 2026 OASDI taxable wage base limit at $184,500.
 *
 * ALL MONETARY CONSTANTS EXPRESSED STRICTLY IN INTEGER CENTS ($1.00 = 100 CENTS).
 */
export const RULES_2026: TaxYearRules = {
  year: 2026,
  version: "2026.1.0-irs-rev-proc-2025-32",
  sourceDoc: "IRS Rev. Proc. 2025-32 / SSA 2026 Contribution & Benefit Base",
  standardDeductions: {
    single: 1610000, // $16,100
    married_filing_jointly: 3220000, // $32,200
    married_filing_separately: 1610000, // $16,100
    head_of_household: 2415000, // $24,150
    qualifying_surviving_spouse: 3220000, // $32,200
  },
  brackets: {
    single: [
      { rate: 0.10, minCents: 0, maxCents: 1240000 },
      { rate: 0.12, minCents: 1240000, maxCents: 5040000 },
      { rate: 0.22, minCents: 5040000, maxCents: 10570000 },
      { rate: 0.24, minCents: 10570000, maxCents: 20177500 },
      { rate: 0.32, minCents: 20177500, maxCents: 25622500 },
      { rate: 0.35, minCents: 25622500, maxCents: 64060000 },
      { rate: 0.37, minCents: 64060000, maxCents: null },
    ],
    married_filing_jointly: [
      { rate: 0.10, minCents: 0, maxCents: 2480000 },
      { rate: 0.12, minCents: 2480000, maxCents: 10080000 },
      { rate: 0.22, minCents: 10080000, maxCents: 21140000 },
      { rate: 0.24, minCents: 21140000, maxCents: 40355000 },
      { rate: 0.32, minCents: 40355000, maxCents: 51245000 },
      { rate: 0.35, minCents: 51245000, maxCents: 76870000 },
      { rate: 0.37, minCents: 76870000, maxCents: null },
    ],
    married_filing_separately: [
      { rate: 0.10, minCents: 0, maxCents: 1240000 },
      { rate: 0.12, minCents: 1240000, maxCents: 5040000 },
      { rate: 0.22, minCents: 5040000, maxCents: 10570000 },
      { rate: 0.24, minCents: 10570000, maxCents: 20177500 },
      { rate: 0.32, minCents: 20177500, maxCents: 25622500 },
      { rate: 0.35, minCents: 25622500, maxCents: 38435000 },
      { rate: 0.37, minCents: 38435000, maxCents: null },
    ],
    head_of_household: [
      { rate: 0.10, minCents: 0, maxCents: 1770000 },
      { rate: 0.12, minCents: 1770000, maxCents: 6745000 },
      { rate: 0.22, minCents: 6745000, maxCents: 10570000 },
      { rate: 0.24, minCents: 10570000, maxCents: 20175000 },
      { rate: 0.32, minCents: 20175000, maxCents: 25620000 },
      { rate: 0.35, minCents: 25620000, maxCents: 64060000 },
      { rate: 0.37, minCents: 64060000, maxCents: null },
    ],
    qualifying_surviving_spouse: [
      { rate: 0.10, minCents: 0, maxCents: 2480000 },
      { rate: 0.12, minCents: 2480000, maxCents: 10080000 },
      { rate: 0.22, minCents: 10080000, maxCents: 21140000 },
      { rate: 0.24, minCents: 21140000, maxCents: 40355000 },
      { rate: 0.32, minCents: 40355000, maxCents: 51245000 },
      { rate: 0.35, minCents: 51245000, maxCents: 76870000 },
      { rate: 0.37, minCents: 76870000, maxCents: null },
    ],
  },
  selfEmployment: {
    statutoryNetProfitFactor: 0.9235,
    socialSecurityRate: 0.124,
    medicareRate: 0.029,
    socialSecurityWageCapCents: 18450000, // $184,500 (SSA 2026 limit)
    deductibleHalfFactor: 0.50,
  },
};
