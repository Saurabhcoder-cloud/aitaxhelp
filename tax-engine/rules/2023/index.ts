import { TaxYearRules } from "../../types";

/**
 * Verified Federal Tax Rules for Tax Year 2023
 * Sourced directly from IRS Revenue Procedure 2022-38 and SSA 2023 announcements.
 * All monetary amounts expressed strictly in integer cents ($1.00 = 100 cents).
 */
export const RULES_2023: TaxYearRules = {
  year: 2023,
  version: "2023.1.0-irs-rev-proc-2022-38",
  sourceDoc: "IRS Rev. Proc. 2022-38 / SSA 2023 Contribution & Benefit Base",
  standardDeductions: {
    single: 1385000, // $13,850
    married_filing_jointly: 2770000, // $27,700
    married_filing_separately: 1385000, // $13,850
    head_of_household: 2080000, // $20,800
    qualifying_surviving_spouse: 2770000, // $27,700
  },
  brackets: {
    single: [
      { rate: 0.10, minCents: 0, maxCents: 1100000 },
      { rate: 0.12, minCents: 1100000, maxCents: 4472500 },
      { rate: 0.22, minCents: 4472500, maxCents: 9537500 },
      { rate: 0.24, minCents: 9537500, maxCents: 18210000 },
      { rate: 0.32, minCents: 18210000, maxCents: 23125000 },
      { rate: 0.35, minCents: 23125000, maxCents: 57812500 },
      { rate: 0.37, minCents: 57812500, maxCents: null },
    ],
    married_filing_jointly: [
      { rate: 0.10, minCents: 0, maxCents: 2200000 },
      { rate: 0.12, minCents: 2200000, maxCents: 8945000 },
      { rate: 0.22, minCents: 8945000, maxCents: 19075000 },
      { rate: 0.24, minCents: 19075000, maxCents: 36420000 },
      { rate: 0.32, minCents: 36420000, maxCents: 46250000 },
      { rate: 0.35, minCents: 46250000, maxCents: 69375000 },
      { rate: 0.37, minCents: 69375000, maxCents: null },
    ],
    married_filing_separately: [
      { rate: 0.10, minCents: 0, maxCents: 1100000 },
      { rate: 0.12, minCents: 1100000, maxCents: 4472500 },
      { rate: 0.22, minCents: 4472500, maxCents: 9537500 },
      { rate: 0.24, minCents: 9537500, maxCents: 18210000 },
      { rate: 0.32, minCents: 18210000, maxCents: 23125000 },
      { rate: 0.35, minCents: 23125000, maxCents: 34687500 },
      { rate: 0.37, minCents: 34687500, maxCents: null },
    ],
    head_of_household: [
      { rate: 0.10, minCents: 0, maxCents: 1570000 },
      { rate: 0.12, minCents: 1570000, maxCents: 5985000 },
      { rate: 0.22, minCents: 5985000, maxCents: 9535000 },
      { rate: 0.24, minCents: 9535000, maxCents: 18210000 },
      { rate: 0.32, minCents: 18210000, maxCents: 23125000 },
      { rate: 0.35, minCents: 23125000, maxCents: 57810000 },
      { rate: 0.37, minCents: 57810000, maxCents: null },
    ],
    qualifying_surviving_spouse: [
      { rate: 0.10, minCents: 0, maxCents: 2200000 },
      { rate: 0.12, minCents: 2200000, maxCents: 8945000 },
      { rate: 0.22, minCents: 8945000, maxCents: 19075000 },
      { rate: 0.24, minCents: 19075000, maxCents: 36420000 },
      { rate: 0.32, minCents: 36420000, maxCents: 46250000 },
      { rate: 0.35, minCents: 46250000, maxCents: 69375000 },
      { rate: 0.37, minCents: 69375000, maxCents: null },
    ],
  },
  selfEmployment: {
    statutoryNetProfitFactor: 0.9235,
    socialSecurityRate: 0.124,
    medicareRate: 0.029,
    socialSecurityWageCapCents: 16020000, // $160,200
    deductibleHalfFactor: 0.50,
  },
};
