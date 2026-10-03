import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { evaluateStateReadiness } from "@/lib/state-tax/readiness";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/state-tax/readiness
 * Evaluates state tax readiness, statutory support, and missing prerequisites.
 *
 * SECURITY:
 * - Session ownership is strictly enforced from the server session.
 * - Does not expose internal credentials or unverified calculations.
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

    const federalReturn = buildFederalReturn(session);
    const readiness = evaluateStateReadiness(session, federalReturn);

    return NextResponse.json({
      success: true,
      data: readiness,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
