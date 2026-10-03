import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { mapFederalReturnToStateInput } from "@/lib/state-tax/federal-bridge";
import { getStateSupportInfo, getStateEngine } from "@/lib/state-tax/registry";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/state-tax/calculate
 * Runs a deterministic state tax calculation if the taxpayer's state is supported.
 *
 * SECURITY:
 * - Completely ignores client-supplied totals. State input is reconstructed
 *   strictly from verified server session state and FederalReturn.
 * - Unsupported states return structured 422 STATE_NOT_SUPPORTED.
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
        "State tax calculation requires a completed federal tax calculation first.",
        422,
        "FEDERAL_RETURN_REQUIRED"
      );
    }

    const stateInput = mapFederalReturnToStateInput(session, federalReturn);
    if (!stateInput.stateCode) {
      throw new AppError(
        "State of residence is required before calculating state tax.",
        422,
        "MISSING_STATE"
      );
    }

    const supportInfo = getStateSupportInfo(stateInput.stateCode);
    if (!supportInfo || supportInfo.supportStatus === "NOT_SUPPORTED") {
      throw new AppError(
        `State tax preparation is not currently supported for ${supportInfo?.stateName || stateInput.stateCode}. TaxAIHelp does not produce unverified state tax calculations.`,
        422,
        "STATE_NOT_SUPPORTED"
      );
    }

    const engine = getStateEngine(stateInput.stateCode);
    const result = engine.calculateStateTax(stateInput);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
