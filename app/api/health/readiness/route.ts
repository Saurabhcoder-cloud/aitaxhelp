import { NextRequest, NextResponse } from "next/server";
import { HealthService } from "@/lib/observability/health";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/health/readiness
 * Readiness endpoint determining whether the system is ready to receive traffic.
 *
 * Distinguishes core availability from optional external services.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);
  Metrics.increment("api_request_total", 1, { endpoint: "/api/health/readiness" });

  const readiness = HealthService.getPublicReadiness();
  const statusCode = readiness.status === "ready" ? 200 : 503;

  const response = NextResponse.json(readiness, { status: statusCode });
  return withRequestId(response, requestId);
}
