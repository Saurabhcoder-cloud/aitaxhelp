/**
 * State Tax Engine Interface & Baseline Engines — Phase 11
 *
 * Provides an extensible, deterministic interface for state income tax computation.
 * Supports adding individual state engines (CA, NY, TX, FL, etc.) without altering
 * federal calculation logic.
 *
 * ARCHITECTURAL INVARIANT:
 * Never invent unsupported state tax rules or fake calculations.
 * States without verified statutory rules return structured NOT_SUPPORTED.
 * States with no individual income tax return verified zero-liability determinations.
 */

import { TaxYear } from "@/types/tax";
import { AppError } from "@/lib/utils/errors";
import {
  StateCalculationInput,
  StateCalculationResult,
  StateReadiness,
  StateValidationError,
  StateValidationCheck,
  StateReturn,
} from "./types";

export interface IStateTaxEngine {
  readonly stateCode: string;
  readonly stateName: string;
  readonly hasIndividualIncomeTax: boolean;
  readonly engineVersion: string;
  readonly rulesVersion: string;

  getSupportedStateCode(): string;
  getSupportedTaxYears(): TaxYear[];
  calculateStateTax(input: StateCalculationInput): StateCalculationResult;
  validateStateReturn(input: StateCalculationInput): StateValidationError[];
  getStateReadiness(input: StateCalculationInput): StateReadiness;
  getRulesMetadata?(taxYear: TaxYear): Record<string, unknown>;
  buildReturn?(
    input: StateCalculationInput,
    sessionMetadata: {
      returnId: string;
      sessionId: string;
      userId: string;
      taxpayerName: string;
      spouseName?: string;
      hasSpouse?: boolean;
    }
  ): StateReturn;
}

// =============================================================================
// NO INCOME TAX STATE ENGINE (TX, FL, WA, NV, AK, SD, WY, TN, NH)
// =============================================================================

export class NoIncomeTaxStateEngine implements IStateTaxEngine {
  public readonly engineVersion = "1.0.0-statutory-no-tax";
  public readonly rulesVersion = "2025.1";
  public readonly hasIndividualIncomeTax = false;

  constructor(
    public readonly stateCode: string,
    public readonly stateName: string,
  ) {}

  public getSupportedStateCode(): string {
    return this.stateCode;
  }

  public getSupportedTaxYears(): TaxYear[] {
    return [2025, 2026];
  }

  public getRulesMetadata(taxYear: TaxYear): Record<string, unknown> {
    return {
      stateCode: this.stateCode,
      stateName: this.stateName,
      taxYear,
      engineVersion: this.engineVersion,
      rulesVersion: this.rulesVersion,
      hasIndividualIncomeTax: false,
      filingRequirement: "No state income tax return required.",
    };
  }

  public calculateStateTax(input: StateCalculationInput): StateCalculationResult {
    const totalWithholding = input.stateWithholdingCents || 0;
    const estimatedPayments = input.stateEstimatedPaymentsCents || 0;
    const totalPayments = totalWithholding + estimatedPayments;

    return {
      stateCode: this.stateCode,
      taxYear: input.taxYear,
      engineVersion: this.engineVersion,
      rulesVersion: this.rulesVersion,
      stateAgiCents: 0,
      stateTaxableIncomeCents: 0,
      grossStateTaxCents: 0,
      nonRefundableCreditsCents: 0,
      netStateTaxCents: 0,
      refundableCreditsCents: 0,
      totalWithholdingCents: totalWithholding,
      estimatedPaymentsCents: estimatedPayments,
      refundOrBalanceCents: totalPayments, // If state withholding occurred, full refund is expected
      refundOrBalanceType: totalPayments > 0 ? "refund" : "zero",
      effectiveTaxRate: 0,
      marginalTaxBracket: 0,
      breakdown: {
        additionsCents: 0,
        subtractionsCents: 0,
        deductionUsedCents: 0,
        exemptionsCents: 0,
      },
    };
  }

  public validateStateReturn(_input: StateCalculationInput): StateValidationError[] {
    return [];
  }

  public getStateReadiness(input: StateCalculationInput): StateReadiness {
    const checks: StateValidationCheck[] = [
      {
        id: "check_no_state_income_tax",
        name: "State Income Tax Requirement",
        category: "STATE_SUPPORT",
        passed: true,
        details: `${this.stateName} does not levy an individual personal income tax on wage or self-employment earnings.`,
      },
      {
        id: "check_state_return_not_required",
        name: "State Filing Requirement",
        category: "STATE_SUPPORT",
        passed: true,
        details: `No individual state income tax return is required to be filed with the State of ${this.stateName}.`,
      },
    ];

    return {
      status: "READY",
      isReady: true,
      stateCode: this.stateCode,
      taxYear: input.taxYear,
      evaluatedAt: new Date().toISOString(),
      checks,
      blockingErrors: [],
      warnings: [],
      summary: {
        totalChecks: checks.length,
        passedChecks: checks.length,
        blockingErrorsCount: 0,
        warningsCount: 0,
      },
      notice: `${this.stateName} has no state individual income tax. You are not required to file a state income tax return for Tax Year ${input.taxYear}.`,
    };
  }

  public buildReturn(
    input: StateCalculationInput,
    sessionMetadata: {
      returnId: string;
      sessionId: string;
      userId: string;
      taxpayerName: string;
      spouseName?: string;
      hasSpouse?: boolean;
    }
  ): StateReturn {
    const calc = this.calculateStateTax(input);
    const readiness = this.getStateReadiness(input);
    const now = new Date().toISOString();

    return {
      returnId: sessionMetadata.returnId,
      sessionId: sessionMetadata.sessionId,
      userId: sessionMetadata.userId,
      metadata: {
        stateCode: this.stateCode,
        stateName: this.stateName,
        taxYear: input.taxYear,
        engineVersion: this.engineVersion,
        rulesVersion: this.rulesVersion,
        hasIncomeTax: false,
        isEngineSupported: true,
        federalReturnVersion: "v2025_v1",
        generatedAt: now,
        supportTier: "NO_INCOME_TAX",
      },
      taxpayer: {
        fullName: sessionMetadata.taxpayerName,
        stateOfResidence: this.stateCode,
        residencyType: input.residencyType,
      },
      spouse: {
        hasSpouse: Boolean(sessionMetadata.hasSpouse),
        fullName: sessionMetadata.spouseName,
        stateOfResidence: sessionMetadata.hasSpouse ? this.stateCode : undefined,
      },
      filingStatus: {
        stateStatus: input.filingStatus,
        label: input.filingStatus.replace(/_/g, " ").toUpperCase(),
        federalStatus: input.filingStatus,
        isConformingWithFederal: true,
      },
      income: {
        federalAgiCents: input.federalAgiCents,
        stateW2WagesCents: input.w2WagesCents,
        state1099GrossCents: input.gross1099IncomeCents,
        stateBusinessProfitCents: input.selfEmploymentProfitCents,
        stateOtherIncomeCents: 0,
        totalStateGrossIncomeCents: 0,
        allocationPercentage: 100,
        multiStateRecords: [],
        isMultiStateReturn: false,
      },
      adjustments: {
        totalAdditionsCents: 0,
        totalSubtractionsCents: 0,
        netAdjustmentsCents: 0,
        items: [],
        stateAdjustedGrossIncomeCents: 0,
      },
      deductions: {
        deductionType: "none",
        stateStandardDeductionCents: 0,
        stateItemizedDeductionCents: 0,
        deductionUsedCents: 0,
        stateExemptionsCents: 0,
        stateTaxableIncomeCents: 0,
      },
      credits: {
        nonRefundableCreditsCents: 0,
        refundableCreditsCents: 0,
        totalCreditsCents: 0,
        items: [],
      },
      liability: {
        stateTaxableIncomeCents: 0,
        grossStateTaxCents: 0,
        netStateTaxCents: 0,
        effectiveTaxRate: 0,
        marginalTaxBracket: 0,
      },
      withholding: {
        w2StateWithholdingCents: calc.totalWithholdingCents,
        form1099StateWithholdingCents: 0,
        totalStateWithholdingCents: calc.totalWithholdingCents,
        records: [],
      },
      payments: {
        totalWithholdingCents: calc.totalWithholdingCents,
        estimatedPaymentsCents: calc.estimatedPaymentsCents || 0,
        refundableCreditsCents: 0,
        totalPaymentsAndCreditsCents: calc.totalWithholdingCents + (calc.estimatedPaymentsCents || 0),
      },
      refundOrBalance: {
        type: calc.refundOrBalanceType,
        amountCents: calc.refundOrBalanceCents,
        estimatedRefundCents: calc.refundOrBalanceCents,
        estimatedAmountOwedCents: 0,
      },
      readiness,
    };
  }
}

// =============================================================================
// UNSUPPORTED STATE ENGINE (Placeholder for States Awaiting Verified Rule Engines)
// =============================================================================

export class UnsupportedStateEngine implements IStateTaxEngine {
  public readonly engineVersion = "0.0.0-unsupported";
  public readonly rulesVersion = "none";
  public readonly hasIndividualIncomeTax = true;

  constructor(
    public readonly stateCode: string,
    public readonly stateName: string,
  ) {}

  public getSupportedStateCode(): string {
    return this.stateCode;
  }

  public getSupportedTaxYears(): TaxYear[] {
    return [];
  }

  public getRulesMetadata(_taxYear: TaxYear): Record<string, unknown> {
    return {
      stateCode: this.stateCode,
      stateName: this.stateName,
      hasIndividualIncomeTax: true,
      supportStatus: "NOT_SUPPORTED",
      reason: "No verified statutory rule engine implemented.",
    };
  }

  public calculateStateTax(input: StateCalculationInput): StateCalculationResult {
    throw new AppError(
      `State tax calculation for ${this.stateName} (${this.stateCode}) is not currently supported. TaxAIHelp does not produce estimated or unverified state tax calculations.`,
      422,
      "STATE_NOT_SUPPORTED",
    );
  }

  public validateStateReturn(_input: StateCalculationInput): StateValidationError[] {
    return [
      {
        code: "STATE_NOT_SUPPORTED",
        category: "STATE_SUPPORT",
        severity: "BLOCKING",
        message: `State income tax calculation for ${this.stateName} is not currently supported.`,
        action: `File your state return directly with the ${this.stateName} Department of Revenue or consult a CPA.`,
        field: "stateCode",
      },
    ];
  }

  public getStateReadiness(input: StateCalculationInput): StateReadiness {
    const error: StateValidationError = {
      code: "STATE_NOT_SUPPORTED",
      category: "STATE_SUPPORT",
      severity: "BLOCKING",
      message: `State tax preparation is not currently supported for ${this.stateName} (${this.stateCode}).`,
      action: `File your ${this.stateName} state return directly with the state revenue authority or work with a qualified tax professional.`,
      field: "stateCode",
    };

    const checks: StateValidationCheck[] = [
      {
        id: "check_state_engine_support",
        name: "State Engine Availability",
        category: "STATE_SUPPORT",
        passed: false,
        details: `TaxAIHelp does not currently have a certified statutory tax engine for ${this.stateName}.`,
        error,
      },
    ];

    return {
      status: "NOT_SUPPORTED",
      isReady: false,
      stateCode: this.stateCode,
      taxYear: input.taxYear,
      evaluatedAt: new Date().toISOString(),
      checks,
      blockingErrors: [error],
      warnings: [],
      summary: {
        totalChecks: 1,
        passedChecks: 0,
        blockingErrorsCount: 1,
        warningsCount: 0,
      },
      notice: `State tax preparation for ${this.stateName} is currently unavailable. TaxAIHelp will never provide guessed or unverified state calculations.`,
    };
  }

  public buildReturn(
    _input: StateCalculationInput,
    _sessionMetadata: any
  ): StateReturn {
    throw new AppError(
      `Cannot build state return for ${this.stateName} because the state is not currently supported.`,
      422,
      "STATE_NOT_SUPPORTED"
    );
  }
}

export { CaliforniaTaxEngine } from "./engines/california-engine";
