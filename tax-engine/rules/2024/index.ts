import { TaxYearRules } from "../../types";

/**
 * Verified Federal Tax Rules for Tax Year 2024
 * Sourced directly from IRS Revenue Procedure 2023-34 and SSA 2024 announcements.
 * All monetary amounts expressed strictly in integer cents ($1.00 = 100 cents).
 */
export const RULES_2024: TaxYearRules = {
  year: 2024,
  version: "2024.1.0-irs-rev-proc-2023-34",
  sourceDoc: "IRS Rev. Proc. 2023-34 / SSA 2024 Contribution & Benefit Base",
  standardDeductions: {
    single: 1460000, // $14,600
    married_filing_jointly: 2920000, // $29,200
    married_filing_separately: 1460000, // $14,600
    head_of_household: 2190000, // $21,900
    qualifying_surviving_spouse: 2920000, // $29,200
  },
  brackets: {
    single: [
      { rate: 0.10, minCents: 0, maxCents: 1160000 },
      { rate: 0.12, minCents: 1160000, maxCents: 4715000 },
      { rate: 0.22, minCents: 4715000, maxCents: 10052500 },
      { rate: 0.24, minCents: 10052500, maxCents: 19195000 },
      { rate: 0.32, minCents: 19195000, maxCents: 24372500 },
      { rate: 0.35, minCents: 24372500, maxCents: 60935000 },
      { rate: 0.37, minCents: 60935000, maxCents: null },
    ],
    married_filing_jointly: [
      { rate: 0.10, minCents: 0, maxCents: 2320000 },
      { rate: 0.12, minCents: 2320000, maxCents: 9430000 },
      { rate: 0.22, minCents: 9430000, maxCents: 20105000 },
      { rate: 0.24, minCents: 20105000, maxCents: 38390000 },
      { rate: 0.32, minCents: 38390000, maxCents: 48745000 },
      { rate: 0.35, minCents: 48745000, maxCents: 73120000 },
      { rate: 0.37, minCents: 73120000, maxCents: null },
    ],
    married_filing_separately: [
      { rate: 0.10, minCents: 0, maxCents: 1160000 },
      { rate: 0.12, minCents: 1160000, maxCents: 4715000 },
      { rate: 0.22, minCents: 4715000, maxCents: 10052500 },
      { rate: 0.24, minCents: 10052500, maxCents: 19195000 },
      { rate: 0.32, minCents: 19195000, maxCents: 24372500 },
      { rate: 0.35, minCents: 24372500, maxCents: 36560000 },
      { rate: 0.37, minCents: 36560000, maxCents: null },
    ],
    head_of_household: [
      { rate: 0.10, minCents: 0, maxCents: 1655000 },
      { rate: 0.12, minCents: 1655000, maxCents: 6310000 },
      { rate: 0.22, minCents: 6310000, maxCents: 10050000 },
      { rate: 0.24, minCents: 10050000, maxCents: 19195000 },
      { rate: 0.32, minCents: 19195000, maxCents: 24370000 },
      { rate: 0.35, minCents: 24370000, maxCents: 60935000 },
      { rate: 0.37, minCents: 60935000, maxCents: null },
    ],
    qualifying_surviving_spouse: [
      { rate: 0.10, minCents: 0, maxCents: 2320000 },
      { rate: 0.12, minCents: 2320000, maxCents: 9430000 },
      { rate: 0.22, minCents: 9430000, maxCents: 20105000 },
      { rate: 0.24, minCents: 20105000, maxCents: 38390000 },
      { rate: 0.32, minCents: 38390000, maxCents: 48745000 },
      { rate: 0.35, minCents: 48745000, maxCents: 73120000 },
      { rate: 0.37, minCents: 73120000, maxCents: null },
    ],
  },
  selfEmployment: {
    statutoryNetProfitFactor: 0.9235,
    socialSecurityRate: 0.124,
    medicareRate: 0.029,
    socialSecurityWageCapCents: 16860000, // $168,600
    deductibleHalfFactor: 0.50,
  },
};
