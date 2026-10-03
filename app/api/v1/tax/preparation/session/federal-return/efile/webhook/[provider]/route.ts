import { NextRequest, NextResponse } from "next/server";
import { processEfileWebhook } from "@/lib/efile/webhook-processor";
import { ProviderWebhookPayload } from "@/lib/efile/types";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/federal-return/efile/webhook/[provider]
 * Provider-neutral webhook callback endpoint for IRS MeF status updates & acknowledgements.
 *
 * SECURITY:
 * - Requires cryptographic signature verification via provider adapter.
 * - Idempotent processing prevents replay attacks or double-credit/double-rejection.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      throw new AppError("Empty webhook request body.", 400, "BAD_REQUEST");
    }

    const signature =
      req.headers.get("x-provider-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("authorization");

    let payload: ProviderWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (_e) {
      throw new AppError("Malformed JSON webhook payload.", 400, "INVALID_JSON");
    }

    payload.provider = params.provider || payload.provider || "unknown_provider";

    const result = await processEfileWebhook(payload, rawBody, signature || undefined);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
