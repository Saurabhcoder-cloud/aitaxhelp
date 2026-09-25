import { TaxYearRules } from "../../types";

/**
 * Verified Federal Tax Rules for Tax Year 2025
 *
 * AUTHORITATIVE SOURCES:
 * 1. IRS Internal Revenue Bulletin 2025-45 & P.L. 119-21 (One Big Beautiful Bill Act / OBBBA)
 *    Modifying and superseding the 2025 standard deduction amounts to:
 *    - Single / MFS: $15,750 (1,575,000 cents)
 *    - Married Filing Jointly / Surviving Spouse: $31,500 (3,150,000 cents)
 *    - Head of Household: $23,625 (2,362,500 cents)
 * 2. IRS Revenue Procedure 2024-40 (Internal Revenue Bulletin 2024-45, § 3.01)
 *    Establishing the 7 statutory rate brackets (10%, 12%, 22%, 24%, 32%, 35%, 37%).
 * 3. Social Security Administration (SSA) Announcement
 *    Establishing the 2025 OASDI maximum taxable earnings limit at $176,100.
 *
 * ALL MONETARY AMOUNTS EXPRESSED STRICTLY IN INTEGER CENTS ($1.00 = 100 CENTS).
 */
export const RULES_2025: TaxYearRules = {
  year: 2025,
  version: "2025.2.0-irs-irb-2025-45-obbba",
  sourceDoc: "IRS IRB 2025-45 / P.L. 119-21 (OBBBA) & SSA 2025 Contribution & Benefit Base",
  standardDeductions: {
    single: 1575000, // $15,750 (IRS IRB 2025-45 / OBBBA)
    married_filing_jointly: 3150000, // $31,500
    married_filing_separately: 1575000, // $15,750
    head_of_household: 2362500, // $23,625
    qualifying_surviving_spouse: 3150000, // $31,500
  },
  brackets: {
    single: [
      { rate: 0.10, minCents: 0, maxCents: 1192500 },
      { rate: 0.12, minCents: 1192500, maxCents: 4847500 },
      { rate: 0.22, minCents: 4847500, maxCents: 10335000 },
      { rate: 0.24, minCents: 10335000, maxCents: 19730000 },
      { rate: 0.32, minCents: 19730000, maxCents: 25052500 },
      { rate: 0.35, minCents: 25052500, maxCents: 62635000 },
      { rate: 0.37, minCents: 62635000, maxCents: null },
    ],
    married_filing_jointly: [
      { rate: 0.10, minCents: 0, maxCents: 2385000 },
      { rate: 0.12, minCents: 2385000, maxCents: 9695000 },
      { rate: 0.22, minCents: 9695000, maxCents: 20670000 },
      { rate: 0.24, minCents: 20670000, maxCents: 39460000 },
      { rate: 0.32, minCents: 39460000, maxCents: 50105000 },
      { rate: 0.35, minCents: 50105000, maxCents: 75160000 },
      { rate: 0.37, minCents: 75160000, maxCents: null },
    ],
    married_filing_separately: [
      { rate: 0.10, minCents: 0, maxCents: 1192500 },
      { rate: 0.12, minCents: 1192500, maxCents: 4847500 },
      { rate: 0.22, minCents: 4847500, maxCents: 10335000 },
      { rate: 0.24, minCents: 10335000, maxCents: 19730000 },
      { rate: 0.32, minCents: 19730000, maxCents: 25052500 },
      { rate: 0.35, minCents: 25052500, maxCents: 37580000 },
      { rate: 0.37, minCents: 37580000, maxCents: null },
    ],
    head_of_household: [
      { rate: 0.10, minCents: 0, maxCents: 1700000 },
      { rate: 0.12, minCents: 1700000, maxCents: 6485000 },
      { rate: 0.22, minCents: 6485000, maxCents: 10335000 },
      { rate: 0.24, minCents: 10335000, maxCents: 19730000 },
      { rate: 0.32, minCents: 19730000, maxCents: 25050000 },
      { rate: 0.35, minCents: 25050000, maxCents: 62635000 },
      { rate: 0.37, minCents: 62635000, maxCents: null },
    ],
    qualifying_surviving_spouse: [
      { rate: 0.10, minCents: 0, maxCents: 2385000 },
      { rate: 0.12, minCents: 2385000, maxCents: 9695000 },
      { rate: 0.22, minCents: 9695000, maxCents: 20670000 },
      { rate: 0.24, minCents: 20670000, maxCents: 39460000 },
      { rate: 0.32, minCents: 39460000, maxCents: 50105000 },
      { rate: 0.35, minCents: 50105000, maxCents: 75160000 },
      { rate: 0.37, minCents: 75160000, maxCents: null },
    ],
  },
  selfEmployment: {
    statutoryNetProfitFactor: 0.9235,
    socialSecurityRate: 0.124,
    medicareRate: 0.029,
    socialSecurityWageCapCents: 17610000, // $176,100 (SSA 2025 limit)
    deductibleHalfFactor: 0.50,
  },
};
