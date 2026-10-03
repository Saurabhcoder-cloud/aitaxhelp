import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyUserIsAdmin } from "@/lib/auth/session";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";
import { addCommentSchema } from "@/lib/validations/professional-review";
import { ReviewActorRole } from "@/lib/professional/types";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ caseId: string }> | { caseId: string };
}

/**
 * POST /api/v1/tax/preparation/session/professional-review/[caseId]/comments
 * Adds a structured review finding/comment to an active case.
 * SECURITY: Taxpayer, assigned professional, or admin only.
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
      throw new AppError("Access denied. You cannot comment on this review case.", 403, "FORBIDDEN");
    }

    const rawBody = await req.json();
    const validated = addCommentSchema.parse(rawBody);

    let actorRole: ReviewActorRole = "taxpayer";
    let actorName = reviewCase.taxpayerName;

    if (isAdmin) {
      actorRole = "admin";
      actorName = "Admin Reviewer";
    } else if (isAssignedPro) {
      actorRole = "professional";
      actorName = reviewCase.assignedProfessionalName || "Assigned CPA/EA";
    }

    const comment = await ProfessionalReviewCaseStore.addComment(
      caseId,
      { id: user.id, name: actorName, role: actorRole },
      {
        section: validated.section,
        message: validated.message,
        severity: validated.severity,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: comment,
        message: "Review finding added successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
