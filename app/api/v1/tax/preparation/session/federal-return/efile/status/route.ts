import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { getFinalReturnSnapshot } from "@/lib/preparation/final-return-snapshot";
import { activeEfileProvider } from "@/lib/efile/provider";
import {
  SubmissionLifecycleStatus,
  LIFECYCLE_STATUS_DESCRIPTORS,
} from "@/lib/efile/submission-lifecycle";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/federal-return/efile/status
 * Returns the current submission lifecycle status, snapshot freeze state,
 * and external provider connectivity for the authenticated taxpayer.
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

    const snapshot = getFinalReturnSnapshot(session.id);
    const isFrozen = Boolean(snapshot);

    let lifecycleStatus: SubmissionLifecycleStatus = "READY_FOR_REVIEW";
    if (isFrozen) {
      lifecycleStatus = "READY_TO_SUBMIT";
    }

    const descriptor = LIFECYCLE_STATUS_DESCRIPTORS[lifecycleStatus];

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        userId: session.userId,
        taxYear: session.taxYear,
        lifecycleStatus,
        lifecycleDescriptor: descriptor,
        isFrozen,
        snapshot: snapshot
          ? {
              snapshotId: snapshot.snapshotId,
              frozenAt: snapshot.frozenAt,
              checksum: snapshot.checksum,
              schemaVersion: snapshot.schemaVersion,
            }
          : null,
        provider: {
          providerId: activeEfileProvider.providerId,
          providerName: activeEfileProvider.providerName,
          isConnected: activeEfileProvider.isConnected,
          transmissionNotice:
            "Electronic transmission to the IRS is offline in this environment. Direct submission is unavailable.",
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
