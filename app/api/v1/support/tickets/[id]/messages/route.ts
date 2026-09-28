import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { SupportService } from "@/lib/services/support-service";
import { addSupportMessageSchema } from "@/lib/validations/support";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError, OperationalError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/support/tickets/[id]/messages
 * Adds a user reply to an existing ticket.
 *
 * SECURITY INVARIANTS:
 * - Verifies user owns the ticket.
 * - Author type is strictly forced to "USER".
 * - isInternal is strictly forced to false.
 * - Rate limiting is enforced.
 * - Sanitizes body to prevent XSS.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new OperationalError(
        "Authentication required to reply to this support ticket.",
        401,
        "UNAUTHORIZED",
        "AUTHENTICATION_ERROR"
      );
    }

    const { id } = await params;
    Metrics.increment("api_request_total", 1, {
      endpoint: "/api/v1/support/tickets/[id]/messages",
    });

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_err) {
      throw new OperationalError(
        "Malformed JSON payload in request body.",
        400,
        "INVALID_JSON",
        "VALIDATION_ERROR"
      );
    }

    const { body } = addSupportMessageSchema.parse(rawBody);

    const message = await SupportService.addUserReply({
      ticketId: id,
      userId: user.id,
      userName: user.email ? user.email.split("@")[0] : "Taxpayer",
      body,
      requestId,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: message,
      },
      { status: 201 }
    );
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, {
      endpoint: "/api/v1/support/tickets/[id]/messages",
    });
    return formatStandardError(error, requestId);
  }
}
