import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { LaunchReadinessService } from "@/lib/operations/launch-readiness";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";
import { AuditLogStore } from "@/lib/services/audit-log-store";

/**
 * GET /api/v1/admin/launch-readiness
 * Retrieves comprehensive pre-launch audit across all 16 platform categories.
 *
 * SECURITY:
 * Strictly restricted to verified administrators (requireAdmin).
 * PRIVACY GUARANTEE: Never exposes secrets or taxpayer numbers.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/launch-readiness" });

    const audit = await LaunchReadinessService.evaluate();

    AuditLogStore.append({
      userId: admin.id,
      action: "launch_readiness_evaluated",
      resourceType: "launch_readiness",
      resourceId: audit.overallStatus,
      metadata: {
        mandatoryPassed: audit.mandatoryPassed,
        passedCount: audit.passedCount,
        blockedCount: audit.blockedCount,
        requestId,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        data: audit,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/launch-readiness" });
    return formatStandardError(error, requestId);
  }
}
