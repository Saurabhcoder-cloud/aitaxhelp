import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyUserIsAdmin } from "@/lib/auth/session";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";
import { ReviewActorRole } from "@/lib/professional/types";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ caseId: string; commentId: string }> | { caseId: string; commentId: string };
}

/**
 * PATCH /api/v1/tax/preparation/session/professional-review/[caseId]/comments/[commentId]
 * Resolves an open review finding.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const resolvedParams = await Promise.resolve(params);
    const { caseId, commentId } = resolvedParams;

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

    let actorRole: ReviewActorRole = "taxpayer";
    let actorName = reviewCase.taxpayerName;

    if (isAdmin) {
      actorRole = "admin";
      actorName = "Admin";
    } else if (isAssignedPro) {
      actorRole = "professional";
      actorName = reviewCase.assignedProfessionalName || "Professional";
    }

    const resolved = await ProfessionalReviewCaseStore.resolveComment(caseId, commentId, {
      id: user.id,
      name: actorName,
      role: actorRole,
    });

    return NextResponse.json({
      success: true,
      data: resolved,
      message: "Comment resolved successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
