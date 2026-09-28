import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { AlertService } from "@/lib/operations/alerts";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * POST /api/v1/admin/operations/alerts/[id]/acknowledge
 * Acknowledges an active operational alert.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/alerts/acknowledge" });

    const updated = AlertService.acknowledgeAlert(params.id, admin.id);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: { message: "Alert not found.", code: "ALERT_NOT_FOUND" } },
        { status: 404 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/alerts/acknowledge" });
    return formatStandardError(error, requestId);
  }
}
