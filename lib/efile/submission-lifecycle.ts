import { AppError } from "@/lib/utils/errors";

// =============================================================================
// 1. SUBMISSION LIFECYCLE STATUSES
// =============================================================================

export type SubmissionLifecycleStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "READY_TO_SUBMIT"
  | "SUBMISSION_PENDING"
  | "SUBMITTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export interface LifecycleStatusDescriptor {
  status: SubmissionLifecycleStatus;
  label: string;
  description: string;
  isExternalState: boolean;
  canEditReturn: boolean;
}

export const LIFECYCLE_STATUS_DESCRIPTORS: Record<
  SubmissionLifecycleStatus,
  LifecycleStatusDescriptor
> = {
  DRAFT: {
    status: "DRAFT",
    label: "Draft Preparation",
    description: "Taxpayer is actively entering income, deductions, and profile data.",
    isExternalState: false,
    canEditReturn: true,
  },
  READY_FOR_REVIEW: {
    status: "READY_FOR_REVIEW",
    label: "Ready for Taxpayer Review",
    description: "All required steps are filled and calculations are ready for review.",
    isExternalState: false,
    canEditReturn: true,
  },
  READY_TO_SUBMIT: {
    status: "READY_TO_SUBMIT",
    label: "Ready to Submit",
    description: "E-file readiness verified and final return snapshot frozen.",
    isExternalState: false,
    canEditReturn: false,
  },
  SUBMISSION_PENDING: {
    status: "SUBMISSION_PENDING",
    label: "Submission Queued",
    description: "Return snapshot queued for transmission to IRS-authorized provider.",
    isExternalState: false,
    canEditReturn: false,
  },
  SUBMITTED: {
    status: "SUBMITTED",
    label: "Transmitted to IRS",
    description: "Return transmitted to IRS Modernized e-File (MeF); awaiting official acknowledgment.",
    isExternalState: true,
    canEditReturn: false,
  },
  ACCEPTED: {
    status: "ACCEPTED",
    label: "Accepted by IRS",
    description: "IRS has officially accepted the federal tax return.",
    isExternalState: true,
    canEditReturn: false,
  },
  REJECTED: {
    status: "REJECTED",
    label: "Rejected by IRS",
    description: "IRS MeF rejected return with specific business rule failure codes.",
    isExternalState: true,
    canEditReturn: true,
  },
  CANCELLED: {
    status: "CANCELLED",
    label: "Filing Cancelled",
    description: "Taxpayer or system cancelled the submission process.",
    isExternalState: false,
    canEditReturn: true,
  },
};

// =============================================================================
// 2. VALID STATE TRANSITIONS TABLE
// =============================================================================

const ALLOWED_TRANSITIONS: Record<
  SubmissionLifecycleStatus,
  SubmissionLifecycleStatus[]
> = {
  DRAFT: ["READY_FOR_REVIEW", "CANCELLED"],
  READY_FOR_REVIEW: ["DRAFT", "READY_TO_SUBMIT", "CANCELLED"],
  READY_TO_SUBMIT: ["READY_FOR_REVIEW", "SUBMISSION_PENDING", "CANCELLED"],
  SUBMISSION_PENDING: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [], // Terminal state for original return
  REJECTED: ["DRAFT", "READY_FOR_REVIEW", "CANCELLED"],
  CANCELLED: ["DRAFT"],
};

// =============================================================================
// 3. TRANSITION VALIDATOR
// =============================================================================

/**
 * Validates whether a requested submission status transition is permissible under
 * strict state machine rules and external provider connectivity constraints.
 */
export function validateLifecycleTransition(
  current: SubmissionLifecycleStatus,
  target: SubmissionLifecycleStatus,
  isProviderConnected: boolean = false
): { allowed: boolean; reason?: string } {
  // 1. Check basic transition graph
  const allowedTargets = ALLOWED_TRANSITIONS[current] || [];
  if (!allowedTargets.includes(target)) {
    return {
      allowed: false,
      reason: `Illegal lifecycle transition: Cannot move directly from '${current}' to '${target}'.`,
    };
  }

  // 2. Enforce external provider prerequisite
  // External states (SUBMITTED, ACCEPTED, REJECTED) require an active external transmitter
  const descriptor = LIFECYCLE_STATUS_DESCRIPTORS[target];
  if (descriptor.isExternalState && !isProviderConnected) {
    return {
      allowed: false,
      reason: `Cannot transition to '${target}' because an active IRS-authorized e-file transmission provider is not connected in this environment.`,
    };
  }

  return { allowed: true };
}

/**
 * Asserts transition validity, throwing an AppError if invalid.
 */
export function assertValidLifecycleTransition(
  current: SubmissionLifecycleStatus,
  target: SubmissionLifecycleStatus,
  isProviderConnected: boolean = false
): void {
  const result = validateLifecycleTransition(current, target, isProviderConnected);
  if (!result.allowed) {
    throw new AppError(result.reason || "Invalid submission lifecycle transition.", 400, "INVALID_STATE_TRANSITION");
  }
}
