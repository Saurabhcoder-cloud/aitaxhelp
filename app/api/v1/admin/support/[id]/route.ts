import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { SupportService } from "@/lib/services/support-service";
import { adminUpdateSupportTicketSchema } from "@/lib/validations/support";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError, OperationalError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/admin/support/[id]
 * Retrieves ticket details, full message history, and internal notes for administrators.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    const { id } = await params;
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/support/[id]" });

    const ticket = await SupportService.getTicketForAdmin(id);

    const response = NextResponse.json({
      success: true,
      data: ticket,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/support/[id]" });
    return formatStandardError(error, requestId);
  }
}

/**
 * PATCH /api/v1/admin/support/[id]
 * Administrative combined update (status, priority, assignment).
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/support/[id]" });

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

    const { status, priority, assignedAdminId } =
      adminUpdateSupportTicketSchema.parse(rawBody);

    let updatedTicket = await SupportService.getTicketForAdmin(id);

    if (status) {
      updatedTicket = {
        ...updatedTicket,
        ...(await SupportService.updateStatus({
          ticketId: id,
          status,
          actorUserId: admin.id,
          isUser: false,
          requestId,
        })),
      };
    }

    if (priority) {
      updatedTicket = {
        ...updatedTicket,
        ...(await SupportService.updatePriority({
          ticketId: id,
          priority,
          adminUserId: admin.id,
          requestId,
        })),
      };
    }

    if (assignedAdminId !== undefined) {
      updatedTicket = {
        ...updatedTicket,
        ...(await SupportService.assignTicket({
          ticketId: id,
          assignedAdminId,
          adminUserId: admin.id,
          requestId,
        })),
      };
    }

    const response = NextResponse.json({
      success: true,
      data: updatedTicket,
      message: "Ticket updated successfully.",
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/support/[id]" });
    return formatStandardError(error, requestId);
  }
}
