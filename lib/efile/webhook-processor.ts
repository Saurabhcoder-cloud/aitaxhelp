/**
 * E-File Webhook & Acknowledgement Processor — Phase 10
 *
 * Provides a provider-neutral, idempotent ingestion engine for external
 * provider status callbacks and IRS MeF acknowledgements.
 *
 * SECURITY & IDEMPOTENCY:
 * - Signature verification: Rejects callbacks with missing or invalid cryptographic signatures.
 * - Idempotency guard: Prevents processing replay attacks or duplicate webhooks.
 * - Server-side state transition: Only authenticated provider callbacks can advance status to ACKNOWLEDGED or ACCEPTED.
 */

import {
  ProviderWebhookPayload,
  WebhookProcessingResult,
} from "./types";
import { getActiveEfileProvider } from "./provider";
import { EfileSubmissionStore } from "@/lib/services/efile-submission-store";
import { AppError } from "@/lib/utils/errors";
import { SubmissionLifecycleStatus } from "./submission-lifecycle";

export async function processEfileWebhook(
  payload: ProviderWebhookPayload,
  rawBody: string,
  signatureHeader?: string
): Promise<WebhookProcessingResult> {
  const provider = getActiveEfileProvider();

  // 1. Authenticate webhook signature
  const isSignatureValid = provider.verifyWebhookSignature(rawBody, signatureHeader);
  if (!isSignatureValid) {
    throw new AppError("Unauthorized: Provider webhook signature verification failed.", 401, "WEBHOOK_UNAUTHORIZED");
  }

  // 2. Locate active submission
  if (!payload.providerSubmissionId) {
    throw new AppError("Malformed webhook payload: Missing providerSubmissionId.", 400, "INVALID_WEBHOOK_PAYLOAD");
  }

  const submission = await EfileSubmissionStore.getByProviderSubmissionId(payload.providerSubmissionId);
  if (!submission) {
    throw new AppError(
      `No submission found matching providerSubmissionId '${payload.providerSubmissionId}'.`,
      404,
      "SUBMISSION_NOT_FOUND"
    );
  }

  // Record raw response for audit & diagnostics
  await EfileSubmissionStore.recordProviderResponse(
    submission.id,
    payload.provider,
    payload.providerSubmissionId,
    payload.eventType,
    payload
  );

  // 3. Map provider event to target lifecycle status
  let targetStatus: SubmissionLifecycleStatus;
  if (payload.eventType === "ACCEPTED") {
    targetStatus = "ACCEPTED";
  } else if (payload.eventType === "REJECTED") {
    targetStatus = "REJECTED";
  } else if (payload.eventType === "ACKNOWLEDGED") {
    targetStatus = "ACKNOWLEDGED";
  } else {
    targetStatus = "FAILED";
  }

  // 4. Idempotency check: Ignore duplicate events
  if (submission.status === targetStatus) {
    return {
      processed: false,
      duplicate: true,
      submissionId: submission.id,
      previousStatus: submission.status,
      newStatus: targetStatus,
      message: `Duplicate webhook event '${payload.eventType}' safely ignored.`,
    };
  }

  // Prevent invalid backwards transitions from terminal states
  if (submission.status === "ACCEPTED") {
    return {
      processed: false,
      duplicate: true,
      submissionId: submission.id,
      previousStatus: submission.status,
      newStatus: submission.status,
      message: "Submission is already officially ACCEPTED. Subsequent events ignored.",
    };
  }

  const previousStatus = submission.status;

  // 5. Update submission state atomically
  await EfileSubmissionStore.updateStatus(
    submission.id,
    targetStatus,
    {
      providerCorrelationId: payload.providerCorrelationId,
      rejectionCode: payload.rejectionDetails?.code,
      rejectionMessage: payload.rejectionDetails?.message,
      rejectionRuleNumber: payload.rejectionDetails?.ruleNumber,
      taxpayerAction: payload.rejectionDetails?.action,
      metadata: {
        irsSubmissionId: payload.irsSubmissionId,
        webhookReceivedAt: new Date().toISOString(),
      },
      isProviderConnected: provider.isConnected,
    },
    "provider_webhook"
  );

  return {
    processed: true,
    duplicate: false,
    submissionId: submission.id,
    previousStatus,
    newStatus: targetStatus,
    message: `Submission status transitioned from ${previousStatus} to ${targetStatus}.`,
  };
}
