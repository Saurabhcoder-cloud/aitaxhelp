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
  credits: {
    childTaxCredit: {
      maxCreditPerChildCents: 200000, // $2,000 per qualifying child
      maxRefundableActcCents: 170000, // $1,700 refundable limit
      phaseoutThresholdCents: {
        single: 20000000, // $200,000
        married_filing_jointly: 40000000, // $400,000
        married_filing_separately: 20000000, // $200,000
        head_of_household: 20000000, // $200,000
        qualifying_surviving_spouse: 20000000, // $200,000
      },
      phaseoutStepCents: 100000, // $1,000
      phaseoutReductionCents: 5000, // $50 per $1,000 or fraction thereof
      actcEarnedIncomeThresholdCents: 250000, // $2,500
      actcRate: 0.15, // 15% of earned income above $2,500
      qualifyingChildMaxAge: 17, // Under 17 as of Dec 31
    },
    creditForOtherDependents: {
      maxCreditPerDependentCents: 50000, // $500 per other qualifying dependent
    },
    earnedIncomeCredit: {
      investmentIncomeLimitCents: 1195000, // $11,950
      disallowedForMfs: true,
      tiers: {
        0: {
          maxCreditCents: 64900, // $649
          phaseInRate: 0.0765,
          earnedIncomeForMaxCreditCents: 849000, // $8,490
          phaseOutThresholdSingleCents: 1062000, // $10,620
          phaseOutThresholdMfjCents: 1773000, // $17,730
          phaseOutRate: 0.0765,
        },
        1: {
          maxCreditCents: 432800, // $4,328
          phaseInRate: 0.34,
          earnedIncomeForMaxCreditCents: 1273000, // $12,730
          phaseOutThresholdSingleCents: 2334000, // $23,340
          phaseOutThresholdMfjCents: 3045000, // $30,450
          phaseOutRate: 0.1598,
        },
        2: {
          maxCreditCents: 715200, // $7,152
          phaseInRate: 0.40,
          earnedIncomeForMaxCreditCents: 1788000, // $17,880
          phaseOutThresholdSingleCents: 2334000, // $23,340
          phaseOutThresholdMfjCents: 3045000, // $30,450
          phaseOutRate: 0.2106,
        },
        3: {
          maxCreditCents: 804600, // $8,046
          phaseInRate: 0.45,
          earnedIncomeForMaxCreditCents: 1788000, // $17,880
          phaseOutThresholdSingleCents: 2334000, // $23,340
          phaseOutThresholdMfjCents: 3045000, // $30,450
          phaseOutRate: 0.2106,
        },
      },
    },
    childAndDependentCare: {
      maxExpensesOnePersonCents: 300000, // $3,000 (IRC § 21(c)(1))
      maxExpensesTwoOrMoreCents: 600000, // $6,000 (IRC § 21(c)(2))
      maxQualifyingAge: 13, // Under age 13
      disallowedForMfs: true, // IRC § 21(e)(2)
      baseRate: 0.35, // 35% for AGI <= $15,000
      minRate: 0.20, // 20% floor for AGI > $43,000
      agiBaseThresholdCents: 1500000, // $15,000
      agiStepCents: 200000, // $2,000 per 1% reduction
      stepRateReduction: 0.01,
    },
    get eitc() {
      return this.earnedIncomeCredit;
    },
  },
  mileage: {
    standardRateCentsPerMile: 70, // 70.0¢ per mile (IRS Notice 2024-87)
    hundredthsRateCents: 7000, // 70.0 * 100
  },
  studentLoanInterest: {
    maxDeductionCents: 250000, // $2,500 statutory cap (IRC § 221(b)(1))
    disallowedForMfs: true, // IRC § 221(f)(1)
    phaseoutThresholdCents: {
      single: 8500000, // $85,000 (IRS Rev. Proc. 2024-40 § 3.33)
      married_filing_jointly: 17000000, // $170,000
      married_filing_separately: 0,
      head_of_household: 8500000, // $85,000
      qualifying_surviving_spouse: 8500000, // $85,000
    },
    phaseoutRangeCents: {
      single: 1500000, // $15,000 window ($85,000 - $100,000)
      married_filing_jointly: 3000000, // $30,000 window ($170,000 - $200,000)
      married_filing_separately: 0,
      head_of_household: 1500000,
      qualifying_surviving_spouse: 1500000,
    },
  },
  itemizedDeductions: {
    medicalAgiFloorRate: 0.075, // 7.5% of AGI (IRC § 213(a))
    saltCapCents: {
      single: 1000000, // $10,000 statutory cap (IRC § 164(b)(6))
      married_filing_jointly: 1000000, // $10,000
      married_filing_separately: 500000, // $5,000 MFS cap
      head_of_household: 1000000, // $10,000
      qualifying_surviving_spouse: 1000000, // $10,000
    },
    charitableCashAgiLimitRate: 0.60, // 60% of AGI (IRC § 170(b)(1)(G))
  },
};
