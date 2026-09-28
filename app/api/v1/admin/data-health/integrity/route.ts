import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { DataIntegrityService } from "@/lib/data/data-integrity";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/data-health/integrity
 * Returns the current/latest non-destructive data integrity diagnostic report.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/integrity" });

    const report = await DataIntegrityService.runAllChecks(admin.id);

    const response = NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/integrity" });
    return formatStandardError(error, requestId);
  }
}

/**
 * POST /api/v1/admin/data-health/integrity
 * Executes fresh non-destructive relational integrity and orphan/duplicate checks.
 */
export async function POST(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/integrity" });

    const report = await DataIntegrityService.runAllChecks(admin.id);

    const response = NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/integrity" });
    return formatStandardError(error, requestId);
  }
}
