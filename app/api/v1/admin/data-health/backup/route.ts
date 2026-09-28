import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { BackupService } from "@/lib/data/backup-provider";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/data-health/backup
 * Returns truthful backup configuration and status telemetry.
 * GUARANTEE: Never fabricates a HEALTHY status when unconfigured.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/backup" });

    const status = BackupService.getStatus();

    const response = NextResponse.json(
      {
        success: true,
        data: status,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/backup" });
    return formatStandardError(error, requestId);
  }
}

/**
 * POST /api/v1/admin/data-health/backup
 * Verifies backup connectivity / provider status.
 */
export async function POST(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/backup" });

    const result = await BackupService.verifyBackup(admin.id);

    const response = NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/backup" });
    return formatStandardError(error, requestId);
  }
}
