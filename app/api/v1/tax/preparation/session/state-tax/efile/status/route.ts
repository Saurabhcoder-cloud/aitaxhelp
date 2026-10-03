import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { StateTaxReturnStore } from "@/lib/services/state-tax-return-store";
import { StateEfileSubmissionStore } from "@/lib/services/state-efile-submission-store";
import { getActiveStateEfileProvider } from "@/lib/state-tax/efile";
import { isStateSupported, getStateSupportInfo } from "@/lib/state-tax/registry";
import { evaluateStateReadiness } from "@/lib/state-tax/readiness";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/state-tax/efile/status
 * Retrieves state e-file readiness, freeze snapshot status, active submission, and event history.
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

    const stateCode = (
      session.profileSnapshot?.stateOfResidence ||
      ""
    ).toUpperCase().trim();

    const supportInfo = getStateSupportInfo(stateCode);
    const federalReturn = buildFederalReturn(session);
    const readiness = evaluateStateReadiness(session, federalReturn);
    const storedReturn = await StateTaxReturnStore.getStateReturn(session.id, stateCode);
    const latestSubmission = await StateEfileSubmissionStore.getLatestSubmission(session.id, stateCode);
    const provider = getActiveStateEfileProvider(stateCode);

    const events = latestSubmission
      ? await StateEfileSubmissionStore.getEvents(latestSubmission.id)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        stateCode,
        stateName: supportInfo?.stateName || stateCode,
        isSupported: isStateSupported(stateCode),
        supportTier: supportInfo?.supportTier,
        isFrozen: storedReturn?.metadata.isFrozen ?? false,
        frozenAt: storedReturn?.metadata.frozenAt ?? null,
        checksumSha256: storedReturn?.metadata.checksumSha256 ?? null,
        provider: {
          providerId: provider.providerId,
          isConnected: provider.isTransmissionConnected,
        },
        readiness: {
          status: readiness.status,
          isReady: readiness.isReady,
          blockingErrorsCount: readiness.blockingErrors.length,
          warningsCount: readiness.warnings.length,
        },
        latestSubmission,
        events,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
