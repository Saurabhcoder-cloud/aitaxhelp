import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { SupportService } from "@/lib/services/support-service";
import { userUpdateTicketSchema } from "@/lib/validations/support";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError, OperationalError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/support/tickets/[id]
 * Retrieves ticket details and public messages for the ticket owner.
 *
 * CRITICAL PRIVACY INVARIANT:
 * Internal admin notes (isInternal = true) are strictly filtered out and never returned.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new OperationalError(
        "Authentication required to view this support ticket.",
        401,
        "UNAUTHORIZED",
        "AUTHENTICATION_ERROR"
      );
    }

    const { id } = await params;
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/support/tickets/[id]" });

    const ticket = await SupportService.getTicketForUser(id, user.id);

    const response = NextResponse.json({
      success: true,
      data: ticket,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/support/tickets/[id]" });
    return formatStandardError(error, requestId);
  }
}

/**
 * PATCH /api/v1/support/tickets/[id]
 * Allows user to close their own open ticket or reopen their own resolved ticket.
 *
 * SECURITY INVARIANT:
 * Users cannot modify assignedAdminId, internal notes, audit fields, or priorities.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new OperationalError(
        "Authentication required to update this support ticket.",
        401,
        "UNAUTHORIZED",
        "AUTHENTICATION_ERROR"
      );
    }

    const { id } = await params;
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/support/tickets/[id]" });

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

    const { action } = userUpdateTicketSchema.parse(rawBody);

    // Verify ownership before status update
    await SupportService.getTicketForUser(id, user.id);

    const targetStatus = action === "close" ? "CLOSED" : "OPEN";

    const updated = await SupportService.updateStatus({
      ticketId: id,
      status: targetStatus,
      actorUserId: user.id,
      isUser: true,
      requestId,
    });

    const response = NextResponse.json({
      success: true,
      data: updated,
      message:
        action === "close"
          ? "Ticket successfully closed."
          : "Ticket successfully reopened.",
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/support/tickets/[id]" });
    return formatStandardError(error, requestId);
  }
}
