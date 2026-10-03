/**
 * State E-File Architecture Foundation — Phase 7
 *
 * Provides a clean interface for future State Modernized e-File (Fed/State MeF)
 * integration while maintaining strict conceptual and operational separation
 * from Federal IRS MeF.
 *
 * ARCHITECTURAL INVARIANT:
 * Never claim that a state return has been electronically transmitted, e-filed,
 * or accepted by any state department of revenue.
 */

import { StateTaxSummary } from "./summary";

export interface StateEfileValidationResult {
  isValid: boolean;
  stateCode: string;
  errors: Array<{ code: string; message: string }>;
}

export interface StateEfileSubmissionResult {
  success: boolean;
  status: "NOT_SUPPORTED" | "DISCONNECTED";
  stateCode: string;
  message: string;
  submissionId: null;
}

export interface IStateEfileProvider {
  readonly stateCode: string;
  readonly isTransmissionConnected: boolean;
  validateStateReturn(summary: StateTaxSummary): Promise<StateEfileValidationResult>;
  submitStateReturn(summary: StateTaxSummary): Promise<StateEfileSubmissionResult>;
}

/**
 * Disconnected State E-File Provider.
 * Discloses that electronic state filing is offline and requires direct state filing.
 */
export class DisconnectedStateEfileProvider implements IStateEfileProvider {
  public readonly isTransmissionConnected = false;

  constructor(public readonly stateCode: string) {}

  public async validateStateReturn(
    summary: StateTaxSummary
  ): Promise<StateEfileValidationResult> {
    return {
      isValid: false,
      stateCode: this.stateCode,
      errors: [
        {
          code: "STATE_EFILE_OFFLINE",
          message: `Electronic filing for ${summary.stateName} is offline. TaxAIHelp does not transmit state returns to state revenue departments.`,
        },
      ],
    };
  }

  public async submitStateReturn(
    summary: StateTaxSummary
  ): Promise<StateEfileSubmissionResult> {
    return {
      success: false,
      status: "DISCONNECTED",
      stateCode: this.stateCode,
      submissionId: null,
      message: `State electronic transmission unavailable. TaxAIHelp does not transmit state tax returns for ${summary.stateName}. Please file directly with the ${summary.stateName} Department of Revenue or print and mail your state forms.`,
    };
  }
}
