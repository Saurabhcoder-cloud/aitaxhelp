import { NextRequest, NextResponse } from "next/server";
import { HealthService } from "@/lib/observability/health";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/health
 * Public liveness endpoint providing safe service health information.
 *
 * CRITICAL PRIVACY & SECURITY INVARIANTS:
 * - Never exposes API keys, database connection strings, or secrets.
 * - Unconfigured dependencies report "not_configured", never false "ok".
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);
  Metrics.increment("api_request_total", 1, { endpoint: "/api/health" });

  const health = HealthService.getPublicLiveness();
  const response = NextResponse.json(health, { status: 200 });

  return withRequestId(response, requestId);
}
