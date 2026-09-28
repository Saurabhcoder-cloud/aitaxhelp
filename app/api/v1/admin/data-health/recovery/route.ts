import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { RestoreVerificationService } from "@/lib/data/restore-verification";
import { TARGET_RPO_MINUTES, TARGET_RTO_MINUTES } from "@/types/data-management";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/data-health/recovery
 * Returns the latest recovery/restore verification audit record, alongside configured RPO/RTO targets.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/recovery" });

    const report = RestoreVerificationService.getLatestReport();

    const response = NextResponse.json(
      {
        success: true,
        data: {
          report,
          targets: {
            configuredTargetRpoMinutes: TARGET_RPO_MINUTES,
            configuredTargetRtoMinutes: TARGET_RTO_MINUTES,
            note: "RPO and RTO are operational targets unless empirically validated by a live recovery drill.",
          },
        },
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/recovery" });
    return formatStandardError(error, requestId);
  }
}

/**
 * POST /api/v1/admin/data-health/recovery
 * Runs simulated restore verification drill.
 */
export async function POST(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/recovery" });

    const report = await RestoreVerificationService.runVerification({
      triggeredBy: admin.id,
      simulateDrill: true,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/recovery" });
    return formatStandardError(error, requestId);
  }
}
