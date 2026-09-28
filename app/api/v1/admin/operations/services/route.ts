import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { ServiceHealthService } from "@/lib/operations/service-health";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/operations/services
 * Returns detailed health reports for all 18 catalog services.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/services" });

    const services = ServiceHealthService.evaluateAllServices();

    const response = NextResponse.json(
      {
        success: true,
        data: services,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/services" });
    return formatStandardError(error, requestId);
  }
}
