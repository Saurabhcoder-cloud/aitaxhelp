/**
 * State E-File Architecture Foundation — Phase 11
 *
 * Provides a clean interface for State Modernized e-File (Fed/State MeF)
 * integration while maintaining strict conceptual and operational separation
 * from Federal IRS MeF.
 *
 * ARCHITECTURAL INVARIANT:
 * Never claim that a state return has been electronically transmitted, e-filed,
 * or accepted by any state department of revenue unless confirmed by an authorized provider.
 * DisconnectedStateEfileProvider is the fail-closed production default.
 */

import { StateTaxSummary } from "./summary";
import { StateReturn, StateEfileLifecycleStatus } from "./types";
import { AppError } from "@/lib/utils/errors";

export interface StateEfileValidationResult {
  isValid: boolean;
  stateCode: string;
  errors: Array<{ code: string; message: string }>;
}

export interface StateEfileSubmissionResult {
  success: boolean;
  status: StateEfileLifecycleStatus | "NOT_SUPPORTED" | "DISCONNECTED";
  stateCode: string;
  message: string;
  submissionId: string | null;
  providerSubmissionId?: string | null;
  isMockTestOnly?: boolean;
}

export interface IStateEfileProvider {
  readonly stateCode: string;
  readonly providerId: string;
  readonly isTransmissionConnected: boolean;
  validateStateReturn(summaryOrReturn: StateTaxSummary | StateReturn): Promise<StateEfileValidationResult>;
  submitStateReturn(summaryOrReturn: StateTaxSummary | StateReturn): Promise<StateEfileSubmissionResult>;
}

/**
 * Validates allowed state transitions for the state e-file lifecycle state machine.
 */
export function canTransitionStateEfile(
  fromStatus: StateEfileLifecycleStatus,
  toStatus: StateEfileLifecycleStatus
): boolean {
  if (fromStatus === toStatus) return true;

  const ALLOWED_TRANSITIONS: Record<StateEfileLifecycleStatus, StateEfileLifecycleStatus[]> = {
    NOT_READY: ["READY", "FAILED"],
    READY: ["NOT_READY", "FROZEN", "FAILED"],
    FROZEN: ["READY", "NOT_READY", "SUBMISSION_PENDING", "FAILED"],
    SUBMISSION_PENDING: ["SUBMITTING", "FROZEN", "FAILED"],
    SUBMITTING: ["SUBMITTED", "ACCEPTED", "REJECTED", "FAILED"],
    SUBMITTED: ["ACKNOWLEDGED", "ACCEPTED", "REJECTED", "FAILED"],
    ACKNOWLEDGED: ["ACCEPTED", "REJECTED", "FAILED"],
    ACCEPTED: [], // Terminal immutable state
    REJECTED: ["READY", "FROZEN", "SUBMISSION_PENDING"], // May fix errors and retry
    FAILED: ["READY", "FROZEN", "SUBMISSION_PENDING"], // May retry
  };

  return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

/**
 * Disconnected State E-File Provider (Default / Fail-Closed).
 * Discloses that electronic state filing is offline and requires direct state filing.
 */
export class DisconnectedStateEfileProvider implements IStateEfileProvider {
  public readonly providerId = "disconnected";
  public readonly isTransmissionConnected = false;

  constructor(public readonly stateCode: string) {}

  public async validateStateReturn(
    summaryOrReturn: StateTaxSummary | StateReturn
  ): Promise<StateEfileValidationResult> {
    const stateName = "stateName" in summaryOrReturn ? summaryOrReturn.stateName : summaryOrReturn.metadata.stateName;
    return {
      isValid: false,
      stateCode: this.stateCode,
      errors: [
        {
          code: "STATE_EFILE_OFFLINE",
          message: `Electronic filing for ${stateName} is offline. TaxAIHelp does not transmit state returns to state revenue departments.`,
        },
      ],
    };
  }

  public async submitStateReturn(
    summaryOrReturn: StateTaxSummary | StateReturn
  ): Promise<StateEfileSubmissionResult> {
    const stateName = "stateName" in summaryOrReturn ? summaryOrReturn.stateName : summaryOrReturn.metadata.stateName;
    return {
      success: false,
      status: "DISCONNECTED",
      stateCode: this.stateCode,
      submissionId: null,
      message: `State electronic transmission unavailable. TaxAIHelp does not transmit state tax returns for ${stateName}. Please file directly with the ${stateName} Department of Revenue or print and mail your state forms.`,
    };
  }
}

export type MockStateBehavior =
  | "SUCCESS_IMMEDIATE"
  | "SUCCESS_DELAYED"
  | "REJECTED"
  | "NETWORK_FAILURE";

/**
 * Mock State E-File Provider for automated unit/integration testing only.
 * Always explicitly stamps responses with "TEST ONLY — NOT FILED".
 */
export class MockStateEfileProvider implements IStateEfileProvider {
  public readonly providerId = "mock-state-provider";
  public readonly isTransmissionConnected = true;
  private behavior: MockStateBehavior = "SUCCESS_DELAYED";

  constructor(
    public readonly stateCode: string,
    behavior: MockStateBehavior = "SUCCESS_DELAYED"
  ) {
    this.behavior = behavior;
  }

  public setBehavior(behavior: MockStateBehavior): void {
    this.behavior = behavior;
  }

  public async validateStateReturn(
    _summaryOrReturn: StateTaxSummary | StateReturn
  ): Promise<StateEfileValidationResult> {
    if (this.behavior === "REJECTED") {
      return {
        isValid: false,
        stateCode: this.stateCode,
        errors: [{ code: "TEST_MOCK_REJECT", message: "Simulated state validation failure." }],
      };
    }
    return {
      isValid: true,
      stateCode: this.stateCode,
      errors: [],
    };
  }

  public async submitStateReturn(
    summaryOrReturn: StateTaxSummary | StateReturn
  ): Promise<StateEfileSubmissionResult> {
    const stateName = "stateName" in summaryOrReturn ? summaryOrReturn.stateName : summaryOrReturn.metadata.stateName;

    if (this.behavior === "NETWORK_FAILURE") {
      throw new AppError("Simulated network failure connecting to state tax authority.", 503, "NETWORK_ERROR");
    }

    if (this.behavior === "REJECTED") {
      return {
        success: false,
        status: "REJECTED",
        stateCode: this.stateCode,
        submissionId: `mock-sub-${Date.now()}`,
        providerSubmissionId: `state-rej-${Date.now()}`,
        message: `TEST ONLY — NOT FILED. Simulated state rejection for ${stateName}.`,
        isMockTestOnly: true,
      };
    }

    if (this.behavior === "SUCCESS_IMMEDIATE") {
      return {
        success: true,
        status: "ACCEPTED",
        stateCode: this.stateCode,
        submissionId: `mock-sub-${Date.now()}`,
        providerSubmissionId: `state-acc-${Date.now()}`,
        message: `TEST ONLY — NOT FILED. Simulated state acceptance for ${stateName}.`,
        isMockTestOnly: true,
      };
    }

    // Default: SUCCESS_DELAYED -> SUBMITTED
    return {
      success: true,
      status: "SUBMITTED",
      stateCode: this.stateCode,
      submissionId: `mock-sub-${Date.now()}`,
      providerSubmissionId: `state-pend-${Date.now()}`,
      message: `TEST ONLY — NOT FILED. State submission received by test gateway for ${stateName}.`,
      isMockTestOnly: true,
    };
  }
}

// Active provider registry / mock override for tests
let globalMockProvider: MockStateEfileProvider | null = null;

export function setTestStateEfileProvider(provider: MockStateEfileProvider | null): void {
  globalMockProvider = provider;
}

export function getActiveStateEfileProvider(stateCode: string): IStateEfileProvider {
  // Fail-closed security guard: in production, never allow mock provider
  if (process.env.NODE_ENV === "production") {
    return new DisconnectedStateEfileProvider(stateCode);
  }

  if (globalMockProvider && globalMockProvider.stateCode.toUpperCase() === stateCode.toUpperCase()) {
    return globalMockProvider;
  }

  return new DisconnectedStateEfileProvider(stateCode);
}
