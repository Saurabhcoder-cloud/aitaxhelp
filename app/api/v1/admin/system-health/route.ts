import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { HealthService } from "@/lib/observability/health";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/system-health
 * Diagnostic system health endpoint strictly restricted to authorized administrators.
 *
 * CRITICAL ACCESS & PRIVACY CONTROLS:
 * - Requires verified admin authorization (requireAdmin).
 * - Excludes API keys, database connection strings, and user tax inputs.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    // 1. Verify administrator credentials
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/system-health" });

    // 2. Fetch diagnostic health report
    const adminHealth = HealthService.getAdminSystemHealth();
    const response = NextResponse.json(
      {
        success: true,
        data: adminHealth,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/system-health" });
    return formatStandardError(error, requestId);
  }
}
