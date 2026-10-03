import { ProfessionalReviewCaseStatus, ReviewActorRole } from "./types";
import { AppError } from "@/lib/utils/errors";

// =============================================================================
// DETERMINISTIC TRANSITION GRAPH
// =============================================================================

const VALID_TRANSITIONS: Record<
  ProfessionalReviewCaseStatus,
  ReadonlyArray<ProfessionalReviewCaseStatus>
> = {
  REQUESTED: ["UNASSIGNED", "ASSIGNED", "CANCELLED"],
  UNASSIGNED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_REVIEW", "UNASSIGNED", "CANCELLED"],
  IN_REVIEW: ["CHANGES_REQUESTED", "READY_FOR_FINAL_REVIEW", "ASSIGNED", "CANCELLED"],
  CHANGES_REQUESTED: ["IN_REVIEW", "READY_FOR_FINAL_REVIEW", "CANCELLED"],
  READY_FOR_FINAL_REVIEW: ["IN_REVIEW", "CHANGES_REQUESTED", "REVIEW_COMPLETED", "CANCELLED"],
  REVIEW_COMPLETED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export interface TransitionValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates whether a state transition is permitted based on the current status,
 * target status, and the actor's role.
 */
export function validateCaseTransition(
  currentStatus: ProfessionalReviewCaseStatus,
  targetStatus: ProfessionalReviewCaseStatus,
  actorRole: ReviewActorRole
): TransitionValidationResult {
  // Idempotent: transition to same status is a no-op
  if (currentStatus === targetStatus) {
    return { isValid: true };
  }

  // System and Admin can perform any transition in the valid edge graph
  const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStatuses.includes(targetStatus)) {
    return {
      isValid: false,
      reason: `Invalid transition from ${currentStatus} to ${targetStatus}.`,
    };
  }

  // Role-based action guards
  if (actorRole === "taxpayer") {
    // Taxpayer can cancel an open case
    if (targetStatus === "CANCELLED") {
      if (currentStatus === "REVIEW_COMPLETED" || currentStatus === "CLOSED") {
        return {
          isValid: false,
          reason: `Taxpayers cannot cancel a completed or closed review.`,
        };
      }
      return { isValid: true };
    }

    // Taxpayer can resubmit when changes are requested
    if (currentStatus === "CHANGES_REQUESTED" && (targetStatus === "IN_REVIEW" || targetStatus === "READY_FOR_FINAL_REVIEW")) {
      return { isValid: true };
    }

    return {
      isValid: false,
      reason: `Taxpayer role is not authorized to transition case from ${currentStatus} to ${targetStatus}.`,
    };
  }

  if (actorRole === "professional") {
    // Professional can start review, request changes, mark ready, complete, or close
    if (currentStatus === "ASSIGNED" && targetStatus === "IN_REVIEW") return { isValid: true };
    if (currentStatus === "IN_REVIEW" && (targetStatus === "CHANGES_REQUESTED" || targetStatus === "READY_FOR_FINAL_REVIEW")) return { isValid: true };
    if (currentStatus === "CHANGES_REQUESTED" && targetStatus === "IN_REVIEW") return { isValid: true };
    if (currentStatus === "READY_FOR_FINAL_REVIEW" && (targetStatus === "REVIEW_COMPLETED" || targetStatus === "CHANGES_REQUESTED" || targetStatus === "IN_REVIEW")) return { isValid: true };
    if (currentStatus === "REVIEW_COMPLETED" && targetStatus === "CLOSED") return { isValid: true };

    return {
      isValid: false,
      reason: `Assigned professional cannot transition case from ${currentStatus} to ${targetStatus}.`,
    };
  }

  // Admin and System are authorized for all graph-compliant transitions
  return { isValid: true };
}

/**
 * Asserts that a state transition is valid, throwing an AppError if invalid.
 */
export function assertValidCaseTransition(
  currentStatus: ProfessionalReviewCaseStatus,
  targetStatus: ProfessionalReviewCaseStatus,
  actorRole: ReviewActorRole
): void {
  const result = validateCaseTransition(currentStatus, targetStatus, actorRole);
  if (!result.isValid) {
    throw new AppError(
      result.reason || `Invalid transition from ${currentStatus} to ${targetStatus}.`,
      400,
      "INVALID_STATE_TRANSITION"
    );
  }
}
