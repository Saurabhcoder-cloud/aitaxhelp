import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { AlertService } from "@/lib/operations/alerts";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";
import { AlertStatus } from "@/types/operations";

/**
 * GET /api/v1/admin/operations/alerts
 * Lists operational alerts, optionally filtered by status query (?status=OPEN).
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/alerts" });

    const statusParam = req.nextUrl.searchParams.get("status") as AlertStatus | null;
    const alerts = AlertService.getAllAlerts(statusParam || undefined);

    const response = NextResponse.json(
      {
        success: true,
        data: alerts,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/alerts" });
    return formatStandardError(error, requestId);
  }
}
