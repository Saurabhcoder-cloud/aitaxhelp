import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/federal-return
 * Generates and returns the structured Federal Tax Return model,
 * readiness assessment, and calculation reconciliation checks for the authenticated user's session.
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

    const federalReturn = buildFederalReturn(session);

    return NextResponse.json({
      success: true,
      data: federalReturn,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/tax/preparation/session/federal-return
 * Equivalent alias for clients using POST to trigger return synthesis.
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
