import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/calculate
 * Runs the deterministic tax calculation on the authenticated user's open preparation session.
 * Persists the resulting calculation in tax_calculations history and links it to the session.
 * SECURITY: User identity is extracted exclusively from the authenticated session.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const session = await TaxPreparationSessionStore.calculate(user.id);
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
