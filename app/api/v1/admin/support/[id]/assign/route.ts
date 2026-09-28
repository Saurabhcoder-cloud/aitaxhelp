import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { SupportService } from "@/lib/services/support-service";
import { adminAssignTicketSchema } from "@/lib/validations/support";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError, OperationalError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/admin/support/[id]/assign
 * Assigns or unassigns a support ticket to an administrator.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    Metrics.increment("api_request_total", 1, {
      endpoint: "/api/v1/admin/support/[id]/assign",
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

    const { assignedAdminId } = adminAssignTicketSchema.parse(rawBody);

    const ticket = await SupportService.assignTicket({
      ticketId: id,
      assignedAdminId,
      adminUserId: admin.id,
      requestId,
    });

    const response = NextResponse.json({
      success: true,
      data: ticket,
      message: assignedAdminId
        ? "Ticket assigned successfully."
        : "Ticket unassigned.",
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, {
      endpoint: "/api/v1/admin/support/[id]/assign",
    });
    return formatStandardError(error, requestId);
  }
}
