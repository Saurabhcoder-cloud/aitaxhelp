import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { validateEfileSubmissionGate } from "@/lib/efile/validation-gate";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/federal-return/efile/validate
 * Evaluates the deterministic pre-submission gate for the authenticated user's session.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const session = await TaxPreparationSessionStore.getCurrent(user.id);
    if (!session) {
      throw new AppError("No open tax preparation session found.", 404, "NOT_FOUND");
    }

    const gateResult = await validateEfileSubmissionGate(session);

    return NextResponse.json({
      success: true,
      data: gateResult,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
