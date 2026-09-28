import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { SupportService } from "@/lib/services/support-service";
import { addSupportMessageSchema } from "@/lib/validations/support";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError, OperationalError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/admin/support/[id]/reply
 * Posts an administrator public reply to the ticket owner.
 *
 * NOTIFICATION: Dispatches email and in-app notifications to the ticket owner.
 * AUDIT: Records support_admin_reply event.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    Metrics.increment("api_request_total", 1, {
      endpoint: "/api/v1/admin/support/[id]/reply",
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

    const message = await SupportService.addAdminReply({
      ticketId: id,
      adminUserId: admin.id,
      adminName: admin.email ? admin.email.split("@")[0] : "Support Team",
      body,
      requestId,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: message,
        message: "Reply sent to user.",
      },
      { status: 201 }
    );
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, {
      endpoint: "/api/v1/admin/support/[id]/reply",
    });
    return formatStandardError(error, requestId);
  }
}
