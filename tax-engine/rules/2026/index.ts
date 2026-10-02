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
      investmentIncomeLimitCents: 1220000, // $12,200
      disallowedForMfs: true,
      tiers: {
        0: {
          maxCreditCents: 66500, // $665
          phaseInRate: 0.0765,
          earnedIncomeForMaxCreditCents: 870000, // $8,700
          phaseOutThresholdSingleCents: 1088000, // $10,880
          phaseOutThresholdMfjCents: 1817000, // $18,170
          phaseOutRate: 0.0765,
        },
        1: {
          maxCreditCents: 443500, // $4,435
          phaseInRate: 0.34,
          earnedIncomeForMaxCreditCents: 1305000, // $13,050
          phaseOutThresholdSingleCents: 2392000, // $23,920
          phaseOutThresholdMfjCents: 3121000, // $31,210
          phaseOutRate: 0.1598,
        },
        2: {
          maxCreditCents: 733000, // $7,330
          phaseInRate: 0.40,
          earnedIncomeForMaxCreditCents: 1833000, // $18,330
          phaseOutThresholdSingleCents: 2392000, // $23,920
          phaseOutThresholdMfjCents: 3121000, // $31,210
          phaseOutRate: 0.2106,
        },
        3: {
          maxCreditCents: 824500, // $8,245
          phaseInRate: 0.45,
          earnedIncomeForMaxCreditCents: 1833000, // $18,330
          phaseOutThresholdSingleCents: 2392000, // $23,920
          phaseOutThresholdMfjCents: 3121000, // $31,210
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
    standardRateCentsPerMile: 70, // 70.0¢ per mile (statutory baseline / IRS Notice projection)
    hundredthsRateCents: 7000, // 70.0 * 100
  },
  studentLoanInterest: {
    maxDeductionCents: 250000, // $2,500 statutory cap (IRC § 221(b)(1))
    disallowedForMfs: true, // IRC § 221(f)(1)
    phaseoutThresholdCents: {
      single: 9000000, // $90,000 (IRS Rev. Proc. 2025-32)
      married_filing_jointly: 17500000, // $175,000
      married_filing_separately: 0,
      head_of_household: 9000000, // $90,000
      qualifying_surviving_spouse: 9000000, // $90,000
    },
    phaseoutRangeCents: {
      single: 1500000, // $15,000 window ($90,000 - $105,000)
      married_filing_jointly: 3000000, // $30,000 window ($175,000 - $205,000)
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
