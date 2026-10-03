import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { buildStateTaxSummary } from "@/lib/state-tax/summary";
import { buildStateBridgeData } from "@/lib/state-tax/federal-bridge";
import { buildStateReturn } from "@/lib/state-tax/state-return-builder";
import { isStateSupported } from "@/lib/state-tax/registry";
import { StateTaxReturnStore } from "@/lib/services/state-tax-return-store";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/state-tax
 * Retrieves the state tax overview, bridge data, canonical state return, and summary for the authenticated user.
 *
 * SECURITY:
 * - Session ownership is strictly enforced via verified session token.
 * - State return is reconstructed server-side; client cannot supply numbers.
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

    let stateReturn = null;
    if (isStateSupported(summary.stateCode)) {
      try {
        // Check if an authoritative frozen or stored state return exists
        const stored = await StateTaxReturnStore.getStateReturn(session.id, summary.stateCode);
        stateReturn = stored || buildStateReturn(session, federalReturn);
      } catch (_err) {
        // Fallback gracefully
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        bridge,
        stateReturn,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
