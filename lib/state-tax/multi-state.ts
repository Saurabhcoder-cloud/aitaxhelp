/**
 * Multi-State Scenario Foundation — Phase 7
 *
 * Provides data modeling and statutory analysis for multi-state tax situations:
 * - Single state of residence
 * - Income earned in a non-resident state
 * - Multiple W-2 states
 * - Remote work across state borders
 * - Multi-state self-employment allocation
 *
 * ARCHITECTURAL INVARIANT:
 * Never guess state allocation percentages or apportionment formulas.
 * Where statutory allocation rules are required, deterministically mark
 * REQUIRES_STATE_RULES or NOT_SUPPORTED.
 */

import { StateIncomeAllocationRecord, StateResidencyType } from "./types";
import { getStateSupportInfo } from "./registry";

export type MultiStateStatus =
  | "SINGLE_STATE"
  | "REQUIRES_STATE_RULES"
  | "NOT_SUPPORTED";

export interface MultiStateW2Entry {
  id: string;
  employerName: string;
  stateCode: string;
  stateWagesCents: number;
  stateWithholdingCents: number;
}

export interface MultiState1099Entry {
  id: string;
  payerName: string;
  stateCode: string;
  grossAmountCents: number;
  stateWithholdingCents: number;
}

export interface MultiStateScenarioInput {
  residentStateCode: string;
  residencyType?: StateResidencyType;
  w2Entries?: MultiStateW2Entry[];
  form1099Entries?: MultiState1099Entry[];
  remoteWorkStates?: string[];
  selfEmploymentStateCode?: string;
}

export interface MultiStateAnalysisResult {
  status: MultiStateStatus;
  isMultiState: boolean;
  residentState: string;
  involvedStates: string[];
  allocationRecords: StateIncomeAllocationRecord[];
  requiresAllocation: boolean;
  message: string;
  actionRequired?: string;
}

/**
 * Analyzes a taxpayer's multi-state scenario deterministically.
 * Does not guess allocations or tax liabilities.
 */
export function analyzeMultiStateScenario(
  input: MultiStateScenarioInput
): MultiStateAnalysisResult {
  const residentState = (input.residentStateCode || "").toUpperCase().trim();
  const involvedStatesSet = new Set<string>();

  if (residentState) {
    involvedStatesSet.add(residentState);
  }

  const w2Entries = input.w2Entries || [];
  const form1099Entries = input.form1099Entries || [];
  const remoteStates = input.remoteWorkStates || [];

  for (const w of w2Entries) {
    if (w.stateCode?.trim()) involvedStatesSet.add(w.stateCode.toUpperCase().trim());
  }

  for (const f of form1099Entries) {
    if (f.stateCode?.trim()) involvedStatesSet.add(f.stateCode.toUpperCase().trim());
  }

  for (const r of remoteStates) {
    if (r?.trim()) involvedStatesSet.add(r.toUpperCase().trim());
  }

  if (input.selfEmploymentStateCode?.trim()) {
    involvedStatesSet.add(input.selfEmploymentStateCode.toUpperCase().trim());
  }

  const involvedStates = Array.from(involvedStatesSet);
  const isMultiState = involvedStates.length > 1;

  // Single-state scenario: straightforward resident filing
  if (!isMultiState) {
    return {
      status: "SINGLE_STATE",
      isMultiState: false,
      residentState,
      involvedStates: residentState ? [residentState] : [],
      allocationRecords: [],
      requiresAllocation: false,
      message: `All income and residency are associated with ${residentState || "single state"}.`,
    };
  }

  // Multi-state scenario detected
  const hasUnsupportedState = involvedStates.some((code) => {
    const info = getStateSupportInfo(code);
    return !info || info.supportStatus === "NOT_SUPPORTED";
  });

  if (hasUnsupportedState) {
    const unsupportedList = involvedStates
      .filter((c) => {
        const info = getStateSupportInfo(c);
        return !info || info.supportStatus === "NOT_SUPPORTED";
      })
      .join(", ");

    return {
      status: "NOT_SUPPORTED",
      isMultiState: true,
      residentState,
      involvedStates,
      allocationRecords: [],
      requiresAllocation: true,
      message: `Multi-state tax preparation involving unsupported states (${unsupportedList}) cannot be completed automatically.`,
      actionRequired:
        "File individual non-resident/resident state returns directly with respective state revenue authorities or consult a CPA.",
    };
  }

  return {
    status: "REQUIRES_STATE_RULES",
    isMultiState: true,
    residentState,
    involvedStates,
    allocationRecords: [],
    requiresAllocation: true,
    message: `Income earned across multiple states (${involvedStates.join(", ")}) requires state-specific wage apportionment and credit for taxes paid to other states.`,
    actionRequired:
      "Verify state wage allocations on your W-2 Form Boxes 15-17 and review state reciprocity agreements.",
  };
}
