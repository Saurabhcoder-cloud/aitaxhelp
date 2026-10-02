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
}

export type TaxRuleRegistry = Record<TaxYear, TaxYearRules>;

export interface CalculationEngineContext {
  engineVersion: string;
  strictMode: boolean;
}
