import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyUserIsAdmin } from "@/lib/auth/session";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";
import { completeReviewSchema } from "@/lib/validations/professional-review";
import { ReviewActorRole } from "@/lib/professional/types";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ caseId: string }> | { caseId: string };
}

/**
 * POST /api/v1/tax/preparation/session/professional-review/[caseId]/complete
 * Allows assigned professional or admin to complete the review.
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
    const isAssignedPro = reviewCase.assignedProfessionalId === user.id;

    if (!isAssignedPro && !isAdmin) {
      throw new AppError("Only the assigned professional or admin can complete the review.", 403, "FORBIDDEN");
    }

    const rawBody = await req.json().catch(() => ({}));
    const validated = completeReviewSchema.parse(rawBody);

    const actorRole: ReviewActorRole = isAdmin ? "admin" : "professional";
    const actorName = isAdmin ? "Admin" : reviewCase.assignedProfessionalName || "Professional";

    const updated = await ProfessionalReviewCaseStore.completeReview(
      caseId,
      { id: user.id, name: actorName, role: actorRole },
      validated.notes
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Professional review marked as completed successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
