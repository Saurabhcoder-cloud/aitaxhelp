import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { buildStateReturn } from "@/lib/state-tax/state-return-builder";
import { evaluateStateReadiness } from "@/lib/state-tax/readiness";
import { StateTaxReturnStore } from "@/lib/services/state-tax-return-store";
import { isStateSupported, getStateSupportInfo } from "@/lib/state-tax/registry";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/state-tax/freeze
 * Freezes the state return snapshot, locking deterministic values and generating SHA-256 digest.
 *
 * SECURITY:
 * - Must be authenticated session owner.
 * - Federal calculation must be completed.
 * - State must be supported and have 0 blocking errors.
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

    const federalReturn = buildFederalReturn(session);
    if (!session.calculationSnapshot || !federalReturn.metadata.hasCalculation) {
      throw new AppError(
        "Freezing a state return requires a completed federal tax calculation first.",
        422,
        "FEDERAL_RETURN_REQUIRED"
      );
    }

    const stateCode = (
      federalReturn.taxpayer.stateOfResidence ||
      session.profileSnapshot?.stateOfResidence ||
      ""
    ).toUpperCase().trim();

    if (!isStateSupported(stateCode)) {
      const info = getStateSupportInfo(stateCode);
      throw new AppError(
        `State return freeze is not supported for ${info?.stateName || stateCode}.`,
        422,
        "STATE_NOT_SUPPORTED"
      );
    }

    const readiness = evaluateStateReadiness(session, federalReturn);
    if (readiness.blockingErrors.length > 0) {
      throw new AppError(
        `Cannot freeze state return: ${readiness.blockingErrors.length} blocking error(s) present.`,
        422,
        "STATE_NOT_READY"
      );
    }

    // Build authoritative state return and freeze
    const stateReturn = buildStateReturn(session, federalReturn);
    stateReturn.metadata.isFrozen = true;
    stateReturn.metadata.frozenAt = new Date().toISOString();

    await StateTaxReturnStore.saveStateReturn(stateReturn);

    return NextResponse.json({
      success: true,
      data: {
        isFrozen: true,
        frozenAt: stateReturn.metadata.frozenAt,
        checksumSha256: stateReturn.metadata.checksumSha256,
        stateCode,
        stateReturn,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
