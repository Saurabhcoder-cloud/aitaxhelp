import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { buildStateTaxSummary } from "@/lib/state-tax/summary";
import { buildStateBridgeData } from "@/lib/state-tax/federal-bridge";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/state-tax
 * Retrieves the state tax overview, bridge data, and summary for the authenticated user.
 *
 * SECURITY:
 * - Session ownership is strictly enforced via the verified session token.
 * - Federal return is reconstructed server-side; client cannot supply numbers.
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
    const summary = buildStateTaxSummary(session, federalReturn);
    const bridge = buildStateBridgeData(session, federalReturn);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        bridge,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
