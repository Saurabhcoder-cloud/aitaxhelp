import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyUserIsAdmin } from "@/lib/auth/session";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";
import { updateCaseStatusSchema } from "@/lib/validations/professional-review";
import { ReviewActorRole } from "@/lib/professional/types";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ caseId: string }> | { caseId: string };
}

/**
 * POST /api/v1/tax/preparation/session/professional-review/[caseId]/status
 * Updates case status enforcing deterministic state machine rules and actor permissions.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const resolvedParams = await Promise.resolve(params);
    const caseId = resolvedParams.caseId;

    const reviewCase = await ProfessionalReviewCaseStore.getById(caseId);
    if (!reviewCase) {
      throw new AppError("Review case not found.", 404, "NOT_FOUND");
    }

    const isAdmin = await verifyUserIsAdmin(user.id, user.email);
    const isOwner = reviewCase.userId === user.id;
    const isAssignedPro = reviewCase.assignedProfessionalId === user.id;

    if (!isOwner && !isAssignedPro && !isAdmin) {
      throw new AppError("Access denied.", 403, "FORBIDDEN");
    }

    const rawBody = await req.json();
    const validated = updateCaseStatusSchema.parse(rawBody);

    let actorRole: ReviewActorRole = "taxpayer";
    let actorName = reviewCase.taxpayerName;

    if (isAdmin) {
      actorRole = "admin";
      actorName = "Admin";
    } else if (isAssignedPro) {
      actorRole = "professional";
      actorName = reviewCase.assignedProfessionalName || "Professional";
    }

    let updated = reviewCase;
    switch (validated.targetStatus) {
      case "IN_REVIEW":
        if (reviewCase.status === "ASSIGNED") {
          updated = await ProfessionalReviewCaseStore.startReview(caseId, {
            id: user.id,
            name: actorName,
            role: actorRole,
          });
        } else if (reviewCase.status === "CHANGES_REQUESTED") {
          updated = await ProfessionalReviewCaseStore.resubmit(
            caseId,
            { id: user.id, name: actorName, role: actorRole },
            validated.notes
          );
        }
        break;

      case "READY_FOR_FINAL_REVIEW":
        updated = await ProfessionalReviewCaseStore.markReadyForFinalReview(caseId, {
          id: user.id,
          name: actorName,
          role: actorRole,
        });
        break;

      case "CHANGES_REQUESTED":
        updated = await ProfessionalReviewCaseStore.requestChanges(
          caseId,
          { id: user.id, name: actorName, role: actorRole },
          validated.notes
        );
        break;

      case "REVIEW_COMPLETED":
        updated = await ProfessionalReviewCaseStore.completeReview(
          caseId,
          { id: user.id, name: actorName, role: actorRole },
          validated.notes
        );
        break;

      case "CLOSED":
        updated = await ProfessionalReviewCaseStore.closeCase(caseId, {
          id: user.id,
          name: actorName,
          role: actorRole,
        });
        break;

      case "CANCELLED":
        updated = await ProfessionalReviewCaseStore.cancelCase(caseId, {
          id: user.id,
          name: actorName,
          role: actorRole,
        });
        break;

      default:
        throw new AppError(`Unsupported direct status transition to ${validated.targetStatus}.`, 400, "BAD_REQUEST");
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Case status transitioned to ${updated.status}.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
