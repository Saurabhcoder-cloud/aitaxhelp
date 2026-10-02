import {
  TaxFilingStatus,
  TaxYear,
  TaxBracket,
  TaxWarning,
  TaxCalculationResult,
  IncomeTaxCalculationInput,
  SelfEmployedCalculationInput,
  QuarterlyTaxCalculationInput,
} from "../types/tax";

export interface TaxCreditsRules {
  childTaxCredit: {
    maxCreditPerChildCents: number;
    maxRefundableActcCents: number;
    phaseoutThresholdCents: Record<TaxFilingStatus, number>;
    phaseoutStepCents: number;
    phaseoutReductionCents: number;
    actcEarnedIncomeThresholdCents: number;
    actcRate: number;
    qualifyingChildMaxAge: number;
  };
  creditForOtherDependents: {
    maxCreditPerDependentCents: number;
  };
  earnedIncomeCredit: {
    investmentIncomeLimitCents: number;
    disallowedForMfs: boolean;
    tiers: Record<
      0 | 1 | 2 | 3,
      {
        maxCreditCents: number;
        phaseInRate: number;
        earnedIncomeForMaxCreditCents: number;
        phaseOutThresholdSingleCents: number;
        phaseOutThresholdMfjCents: number;
        phaseOutRate: number;
      }
    >;
  };
  eitc?: {
    investmentIncomeLimitCents: number;
    disallowedForMfs: boolean;
    tiers: Record<
      0 | 1 | 2 | 3,
      {
        maxCreditCents: number;
        phaseInRate: number;
        earnedIncomeForMaxCreditCents: number;
        phaseOutThresholdSingleCents: number;
        phaseOutThresholdMfjCents: number;
        phaseOutRate: number;
      }
    >;
  };
  childAndDependentCare?: ChildCareCreditRules;
}

export interface MileageRules {
  standardRateCentsPerMile: number; // e.g. 70 for 2025, 67 for 2024
  hundredthsRateCents: number; // rate * 100, e.g. 6550 for 2023 (65.5 cents)
}

export interface StudentLoanInterestRules {
  maxDeductionCents: number; // 250,000 cents ($2,500)
  disallowedForMfs: boolean;
  phaseoutThresholdCents: Record<TaxFilingStatus, number>;
  phaseoutRangeCents: Record<TaxFilingStatus, number>;
}

export interface ChildCareCreditRules {
  maxExpensesOnePersonCents: number; // 300,000 cents ($3,000)
  maxExpensesTwoOrMoreCents: number; // 600,000 cents ($6,000)
  maxQualifyingAge: number; // 13 (must be under 13)
  disallowedForMfs: boolean;
  baseRate: number; // 0.35 (35%)
  minRate: number; // 0.20 (20%)
  agiBaseThresholdCents: number; // 1,500,000 cents ($15,000)
  agiStepCents: number; // 200,000 cents ($2,000)
  stepRateReduction: number; // 0.01 (1 percentage point)
}

export interface ItemizedDeductionRules {
  medicalAgiFloorRate: number; // 0.075 (7.5% of AGI)
  saltCapCents: Record<TaxFilingStatus, number>; // $10,000 ($1,000,000 cents) except $5,000 ($500,000 cents) for MFS
  charitableCashAgiLimitRate: number; // 0.60 (60% of AGI)
}

export interface TaxYearRules {
  year: TaxYear;
  version: string;
  sourceDoc: string;
  standardDeductions: Record<TaxFilingStatus, number>; // in integer cents
  brackets: Record<TaxFilingStatus, TaxBracket[]>;
  selfEmployment: {
    statutoryNetProfitFactor: number; // 0.9235 (92.35%)
    socialSecurityRate: number; // 0.124 (12.4%)
    medicareRate: number; // 0.029 (2.9%)
    socialSecurityWageCapCents: number; // e.g. $160,200 for 2023 ($168,600 for 2024)
    deductibleHalfFactor: number; // 0.50 (50%)
  };
  credits?: TaxCreditsRules;
  mileage?: MileageRules;
  studentLoanInterest?: StudentLoanInterestRules;
  itemizedDeductions?: ItemizedDeductionRules;
}

export type TaxRuleRegistry = Record<TaxYear, TaxYearRules>;

export interface CalculationEngineContext {
  engineVersion: string;
  strictMode: boolean;
}
