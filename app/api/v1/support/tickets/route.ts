import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { SupportService } from "@/lib/services/support-service";
import {
  createSupportTicketSchema,
  supportSearchFilterSchema,
} from "@/lib/validations/support";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError, OperationalError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/support/tickets
 * Lists tickets owned by the authenticated user with bounded pagination.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new OperationalError(
        "Authentication required to view support tickets.",
        401,
        "UNAUTHORIZED",
        "AUTHENTICATION_ERROR"
      );
    }

    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/support/tickets" });

    const { searchParams } = new URL(req.url);
    const parsed = supportSearchFilterSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const result = await SupportService.listTicketsForUser(user.id, {
      page: parsed.page,
      limit: parsed.limit,
      status: parsed.status,
    });

    const response = NextResponse.json({
      success: true,
      data: result,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/support/tickets" });
    return formatStandardError(error, requestId);
  }
}

/**
 * POST /api/v1/support/tickets
 * Submits a new support ticket.
 *
 * CRITICAL PRIVACY & SECURITY INVARIANTS:
 * - Extracts userId strictly from session; ignores any client-supplied userId.
 * - Server generates ticket number (e.g. TAH-2026-000101).
 * - Sanitizes all user-supplied text inputs.
 * - Stores minimal safe context; zero tax liability / refund numbers.
 */
export async function POST(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new OperationalError(
        "Authentication required to submit a support ticket.",
        401,
        "UNAUTHORIZED",
        "AUTHENTICATION_ERROR"
      );
    }

    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/support/tickets" });

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

    const payload = createSupportTicketSchema.parse(rawBody);

    const ticket = await SupportService.createTicket({
      userId: user.id,
      userEmail: user.email,
      userName: user.email ? user.email.split("@")[0] : "Taxpayer",
      subject: payload.subject,
      category: payload.category,
      priority: payload.priority,
      description: payload.description,
      safeContext: payload.safeContext,
      rating: payload.rating,
      requestId,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: ticket,
        message: `Your request has been submitted as ${ticket.ticketNumber}.`,
      },
      { status: 201 }
    );
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/support/tickets" });
    return formatStandardError(error, requestId);
  }
}
