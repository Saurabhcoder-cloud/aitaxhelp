import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";
import { resubmitReviewSchema } from "@/lib/validations/professional-review";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ caseId: string }> | { caseId: string };
}

/**
 * POST /api/v1/tax/preparation/session/professional-review/[caseId]/resubmit
 * Taxpayer resubmits their updated preparation session for re-review.
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

    if (reviewCase.userId !== user.id) {
      throw new AppError("You can only resubmit your own review case.", 403, "FORBIDDEN");
    }

    const rawBody = await req.json().catch(() => ({}));
    const validated = resubmitReviewSchema.parse(rawBody);

    const updated = await ProfessionalReviewCaseStore.resubmit(
      caseId,
      { id: user.id, name: reviewCase.taxpayerName, role: "taxpayer" },
      validated.taxpayerNotes
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Tax return resubmitted for professional review successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
