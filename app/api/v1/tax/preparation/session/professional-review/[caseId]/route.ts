import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyUserIsAdmin } from "@/lib/auth/session";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ caseId: string }> | { caseId: string };
}

/**
 * GET /api/v1/tax/preparation/session/professional-review/[caseId]
 * Retrieves full case detail including snapshot, comments, and event timeline.
 * SECURITY: Taxpayer, assigned professional, or admin only.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const resolvedParams = await Promise.resolve(params);
    const caseId = resolvedParams.caseId;

    if (!caseId) {
      throw new AppError("Case ID is required.", 400, "BAD_REQUEST");
    }

    const reviewCase = await ProfessionalReviewCaseStore.getById(caseId);
    if (!reviewCase) {
      throw new AppError("Review case not found.", 404, "NOT_FOUND");
    }

    const isAdmin = await verifyUserIsAdmin(user.id, user.email);
    const isOwner = reviewCase.userId === user.id;
    const isAssignedPro = reviewCase.assignedProfessionalId === user.id;

    if (!isOwner && !isAssignedPro && !isAdmin) {
      throw new AppError("Access denied to this review case.", 403, "FORBIDDEN");
    }

    return NextResponse.json({
      success: true,
      data: reviewCase,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
