import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";
import { assignProfessionalSchema } from "@/lib/validations/professional-review";
import { handleApiError } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ caseId: string }> | { caseId: string };
}

/**
 * POST /api/v1/tax/preparation/session/professional-review/[caseId]/assign
 * Admin assigns an authorized tax professional to a review case.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const resolvedParams = await Promise.resolve(params);
    const caseId = resolvedParams.caseId;

    const rawBody = await req.json();
    const validated = assignProfessionalSchema.parse(rawBody);

    const updated = await ProfessionalReviewCaseStore.assignProfessional(
      caseId,
      { id: admin.id, name: admin.email || "Administrator", role: "admin" },
      { id: validated.professionalId, name: validated.professionalName }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Assigned professional ${validated.professionalName} to review case.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
