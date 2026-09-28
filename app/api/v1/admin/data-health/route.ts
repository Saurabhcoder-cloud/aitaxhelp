import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { DataHealthService } from "@/lib/data/data-health";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/data-health
 * Returns aggregated health metadata across database availability, backup status,
 * recovery targets, restore verification, retention health, and integrity diagnostics.
 *
 * SAFETY INVARIANT: Strictly excludes raw taxpayer records, calculations, or backup secrets.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health" });

    const summary = await DataHealthService.getHealthSummary(admin.id);

    const response = NextResponse.json(
      {
        success: true,
        data: summary,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health" });
    return formatStandardError(error, requestId);
  }
}
