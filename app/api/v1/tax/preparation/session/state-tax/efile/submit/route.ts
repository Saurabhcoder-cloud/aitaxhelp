import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { StateTaxReturnStore } from "@/lib/services/state-tax-return-store";
import { StateEfileSubmissionStore } from "@/lib/services/state-efile-submission-store";
import { getActiveStateEfileProvider, DisconnectedStateEfileProvider } from "@/lib/state-tax/efile";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/state-tax/efile/submit
 * Submits the frozen state return to the active state e-file provider.
 *
 * SAFETY INVARIANTS:
 * - Production default: DisconnectedStateEfileProvider fails closed with 422.
 * - Requires verified frozen snapshot.
 * - Idempotency enforced: duplicate in-flight submissions blocked.
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

    const stateCode = (
      session.profileSnapshot?.stateOfResidence ||
      ""
    ).toUpperCase().trim();

    if (!stateCode) {
      throw new AppError("State of residence is required.", 422, "MISSING_STATE");
    }

    // 1. Verify frozen state return snapshot
    const storedReturn = await StateTaxReturnStore.getStateReturn(session.id, stateCode);
    if (!storedReturn || !storedReturn.metadata.isFrozen) {
      throw new AppError(
        "State return must be frozen before submitting for electronic filing.",
        422,
        "STATE_RETURN_NOT_FROZEN"
      );
    }

    // 2. Check for active duplicate submissions
    const existingActive = await StateEfileSubmissionStore.getActiveSubmission(session.id, stateCode);
    if (existingActive) {
      throw new AppError(
        `An active state submission (${existingActive.id}) is already in progress with status '${existingActive.status}'.`,
        409,
        "DUPLICATE_SUBMISSION"
      );
    }

    // 3. Resolve active provider
    const provider = getActiveStateEfileProvider(stateCode);

    // Fail-closed production enforcement
    if (provider instanceof DisconnectedStateEfileProvider || !provider.isTransmissionConnected) {
      throw new AppError(
        `State electronic filing for ${storedReturn.metadata.stateName} (${stateCode}) is offline. TaxAIHelp does not transmit state returns to state revenue departments. Please print and mail your state forms or file directly with the state revenue authority.`,
        422,
        "STATE_EFILE_OFFLINE"
      );
    }

    // 4. Create submission record
    const submission = await StateEfileSubmissionStore.createSubmission({
      sessionId: session.id,
      userId: user.id,
      stateCode,
      taxYear: storedReturn.metadata.taxYear,
      providerId: provider.providerId,
      snapshotChecksum: storedReturn.metadata.checksumSha256 || "",
    });

    // 5. Submit to provider
    await StateEfileSubmissionStore.updateSubmissionStatus({
      submissionId: submission.id,
      toStatus: "SUBMITTING",
      message: `Transmitting return package to ${provider.providerId}.`,
    });

    try {
      const result = await provider.submitStateReturn(storedReturn);

      if (result.status === "ACCEPTED") {
        const updated = await StateEfileSubmissionStore.updateSubmissionStatus({
          submissionId: submission.id,
          toStatus: "ACCEPTED",
          providerSubmissionId: result.providerSubmissionId,
          providerStatus: "ACCEPTED",
          providerMessage: result.message,
          message: result.message,
        });

        return NextResponse.json({
          success: true,
          data: {
            submission: updated,
            result,
          },
        });
      } else if (result.status === "REJECTED") {
        const updated = await StateEfileSubmissionStore.updateSubmissionStatus({
          submissionId: submission.id,
          toStatus: "REJECTED",
          providerSubmissionId: result.providerSubmissionId,
          providerStatus: "REJECTED",
          providerMessage: result.message,
          message: result.message,
        });

        return NextResponse.json({
          success: false,
          data: {
            submission: updated,
            result,
          },
        }, { status: 422 });
      } else {
        // Pending / Submitted
        const updated = await StateEfileSubmissionStore.updateSubmissionStatus({
          submissionId: submission.id,
          toStatus: "SUBMITTED",
          providerSubmissionId: result.providerSubmissionId,
          providerStatus: "PENDING",
          providerMessage: result.message,
          message: result.message,
        });

        return NextResponse.json({
          success: true,
          data: {
            submission: updated,
            result,
          },
        });
      }
    } catch (providerError: any) {
      await StateEfileSubmissionStore.updateSubmissionStatus({
        submissionId: submission.id,
        toStatus: "FAILED",
        message: providerError?.message || "Provider transmission failure.",
      });
      throw providerError;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
