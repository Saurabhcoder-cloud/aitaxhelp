/**
 * State Tax Engine Interface & Baseline Engines — Phase 7
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

  public calculateStateTax(input: StateCalculationInput): StateCalculationResult {
    const totalWithholding = input.stateWithholdingCents || 0;
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
      refundOrBalanceCents: totalWithholding, // If state withholding occurred, full refund is expected
      refundOrBalanceType: totalWithholding > 0 ? "refund" : "zero",
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
}
