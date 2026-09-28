import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { SupportService } from "@/lib/services/support-service";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/support/stats
 * Compiles live aggregate support metrics for administrative oversight.
 *
 * PRIVACY INVARIANT:
 * Strictly aggregate operational counts only. Never includes taxpayer financial data or individual income.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/support/stats" });

    const stats = await SupportService.getSupportStats();

    const response = NextResponse.json({
      success: true,
      data: stats,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/support/stats" });
    return formatStandardError(error, requestId);
  }
}
