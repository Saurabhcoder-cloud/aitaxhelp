import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { ErrorBudgetCalculator } from "@/lib/operations/error-budget";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/operations/error-budget
 * Returns error budget reports across all services.
 * HONESTY INVARIANT: When timeseries metrics are unmeasured, returns measurementState: NO_DATA.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/error-budget" });

    const reports = ErrorBudgetCalculator.calculateAll(30);

    const response = NextResponse.json(
      {
        success: true,
        data: reports,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/error-budget" });
    return formatStandardError(error, requestId);
  }
}
