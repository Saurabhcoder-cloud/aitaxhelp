import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { validateEfileSubmissionGate } from "@/lib/efile/validation-gate";
import { getActiveEfileProvider } from "@/lib/efile/provider";
import { buildCanonicalEfilePayload } from "@/lib/efile/canonical-payload";
import { EfileSubmissionStore } from "@/lib/services/efile-submission-store";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/federal-return/efile/submit
 * Authoritative submission endpoint for federal electronic filing.
 *
 * CRITICAL TAX SAFETY & INTEGRITY:
 * - Server reconstructs and validates the authoritative FederalReturn.
 * - Enforces pre-submission gate (readiness, reconciliation, pro review, snapshot freshness).
 * - Client cannot pass totals, override numbers, or forge submission states.
 * - Idempotency guard prevents duplicate or concurrent submissions.
 * - Fails closed if authorized provider is offline or unconfigured.
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

    // Verify session belongs to authenticated user
    if (session.userId !== user.id) {
      throw new AppError("Unauthorized access to tax preparation session.", 403, "FORBIDDEN");
    }

    // 1. Strict Server-Side Validation Gate
    const gate = await validateEfileSubmissionGate(session);
    if (!gate.isReady || !gate.snapshot) {
      const errorMsg = gate.blockingIssues.length > 0
        ? gate.blockingIssues.join("; ")
        : "Tax return is not ready for federal electronic filing.";
      throw new AppError(errorMsg, 422, "EFILE_GATE_BLOCKED");
    }

    const snapshot = gate.snapshot;

    // 2. Read request body & extract idempotency key
    const body = await req.json().catch(() => ({}));
    const rawKey = body?.idempotencyKey || `${snapshot.checksum}-${session.id}`;
    const idempotencyKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    // 3. Idempotency Check: Prevent duplicate transmissions
    const existing = await EfileSubmissionStore.getByIdempotencyKey(idempotencyKey);
    if (existing && ["SUBMITTED", "ACKNOWLEDGED", "ACCEPTED"].includes(existing.status)) {
      return NextResponse.json({
        success: true,
        data: existing,
        idempotent: true,
        message: "Return has already been transmitted under this snapshot.",
      });
    }

    // 4. Verify Active Provider
    const provider = getActiveEfileProvider();
    if (!provider.isConnected) {
      throw new AppError(
        "Electronic transmission to the IRS is unavailable. An authorized IRS MeF transmission provider is not connected in this environment.",
        503,
        "PROVIDER_DISCONNECTED"
      );
    }

    // 5. Pre-flight Provider Validation
    const providerPreflight = await provider.validateSubmission(snapshot);
    if (!providerPreflight.isValid) {
      const firstErr = providerPreflight.errors[0]?.description || "Provider validation rejected return structure.";
      throw new AppError(`Provider validation failed: ${firstErr}`, 422, "PROVIDER_VALIDATION_FAILED");
    }

    // 6. Build Provider-Neutral Canonical Payload
    const canonicalPayload = buildCanonicalEfilePayload(snapshot, { isTest: provider.isMock });

    // 7. Create Durable Submission Record (SUBMISSION_PENDING)
    const submission = await EfileSubmissionStore.createSubmission({
      sessionId: session.id,
      userId: user.id,
      taxYear: session.taxYear,
      snapshotId: snapshot.snapshotId,
      snapshotHash: snapshot.checksum,
      provider: provider.providerId,
      idempotencyKey,
      isTestSubmission: provider.isMock,
      metadata: {
        transmissionNotice: provider.isMock
          ? "DEVELOPMENT/TEST SUBMISSION — NOT FILED WITH IRS"
          : "OFFICIAL TRANSMISSION",
        userConfirmed: Boolean(body?.userConfirmed),
      },
    });

    // 8. Transition to SUBMITTING
    await EfileSubmissionStore.updateStatus(
      submission.id,
      "SUBMITTING",
      { isProviderConnected: provider.isConnected },
      "taxpayer"
    );

    // 9. Transmit to Provider Adapter
    const providerResult = await provider.submit(snapshot, canonicalPayload, idempotencyKey);

    // 10. Update Submission with Provider Response
    const updatedSubmission = await EfileSubmissionStore.updateStatus(
      submission.id,
      providerResult.status,
      {
        providerSubmissionId: providerResult.providerSubmissionId,
        providerCorrelationId: providerResult.providerCorrelationId,
        rejectionMessage: !providerResult.success ? providerResult.message : undefined,
        metadata: {
          responseType: providerResult.responseType,
          irsTransmissionTimestamp: providerResult.irsTransmissionTimestamp,
          isSimulated: providerResult.isSimulated,
        },
        isProviderConnected: provider.isConnected,
      },
      "taxpayer"
    );

    return NextResponse.json({
      success: providerResult.success,
      data: updatedSubmission,
      disclaimer: provider.isMock
        ? "DEVELOPMENT/TEST SUBMISSION — NOT FILED WITH IRS. FOR AUTOMATED TESTING ONLY."
        : "TRANSMISSION RECORDED WITH AUTHORIZED IRS MEF TRANSMITTER.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
