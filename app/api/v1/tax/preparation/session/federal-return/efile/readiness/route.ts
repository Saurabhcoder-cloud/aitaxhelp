import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { evaluateEfileReadiness } from "@/lib/preparation/efile-readiness";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/federal-return/efile/readiness
 * Evaluates structural IRS Modernized e-File (MeF) readiness for the authenticated user's session.
 *
 * SECURITY: User identity is extracted exclusively from the authenticated session.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const session = await TaxPreparationSessionStore.getCurrent(user.id);
    if (!session) {
      throw new AppError("No open tax preparation session found.", 404, "NOT_FOUND");
    }

    const evaluation = evaluateEfileReadiness(session);

    return NextResponse.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
