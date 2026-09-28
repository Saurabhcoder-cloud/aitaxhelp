import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { DeploymentReadinessService } from "@/lib/deployment/deployment-readiness";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";
import { AuditLogStore } from "@/lib/services/audit-log-store";

/**
 * GET /api/v1/admin/deployment/readiness
 * Retrieves comprehensive deployment readiness assessment across all subsystems.
 *
 * ACCESS & SECURITY:
 * - Strictly requires verified administrator credentials (requireAdmin).
 * - Excludes database URLs, API keys, and secret values.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/deployment/readiness" });

    const report = DeploymentReadinessService.evaluateReadiness(requestId);

    // Audit the readiness inspection
    AuditLogStore.append({
      userId: admin.id,
      action: "deployment:readiness_checked",
      resourceType: "deployment",
      resourceId: report.build.appVersion,
      metadata: {
        environment: report.environment,
        overallStatus: report.overallStatus,
        hasBlockingErrors: report.hasBlockingErrors,
        requestId,
      },
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
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/deployment/readiness" });
    return formatStandardError(error, requestId);
  }
}
