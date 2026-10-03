import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { getFinalReturnSnapshot } from "@/lib/preparation/final-return-snapshot";
import { getActiveEfileProvider } from "@/lib/efile/provider";
import { EfileSubmissionStore } from "@/lib/services/efile-submission-store";
import {
  SubmissionLifecycleStatus,
  LIFECYCLE_STATUS_DESCRIPTORS,
} from "@/lib/efile/submission-lifecycle";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/federal-return/efile/status
 * Returns current submission lifecycle status, snapshot freeze state,
 * active submission metadata, and external provider connectivity for the authenticated taxpayer.
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

    const provider = getActiveEfileProvider();
    const snapshot = getFinalReturnSnapshot(session.id);
    const isFrozen = Boolean(snapshot);

    // Check for an active submission record
    const latestSubmission = await EfileSubmissionStore.getLatestForSession(session.id);

    let lifecycleStatus: SubmissionLifecycleStatus = "READY_FOR_REVIEW";
    if (latestSubmission) {
      lifecycleStatus = latestSubmission.status;
    } else if (isFrozen) {
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
        activeSubmission: latestSubmission
          ? {
              id: latestSubmission.id,
              provider: latestSubmission.provider,
              providerSubmissionId: latestSubmission.providerSubmissionId,
              providerCorrelationId: latestSubmission.providerCorrelationId,
              status: latestSubmission.status,
              isTestSubmission: latestSubmission.isTestSubmission,
              submittedAt: latestSubmission.submittedAt,
              acknowledgedAt: latestSubmission.acknowledgedAt,
              acceptedAt: latestSubmission.acceptedAt,
              rejectedAt: latestSubmission.rejectedAt,
              rejectionCode: latestSubmission.rejectionCode,
              rejectionMessage: latestSubmission.rejectionMessage,
              taxpayerAction: latestSubmission.taxpayerAction,
              lastProviderResponseAt: latestSubmission.lastProviderResponseAt,
            }
          : null,
        provider: {
          providerId: provider.providerId,
          providerName: provider.providerName,
          isConnected: provider.isConnected,
          isMock: provider.isMock,
          transmissionNotice: !provider.isConnected
            ? "Electronic transmission to the IRS is offline in this environment. Direct submission is unavailable."
            : provider.isMock
            ? "Development/Test Transmitter active. NOT FILED WITH THE IRS."
            : "Authorized IRS MeF Provider Connected.",
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
