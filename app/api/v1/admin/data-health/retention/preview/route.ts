import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { RetentionPolicyService } from "@/lib/data/retention-policy";
import { retentionPreviewSchema } from "@/lib/validations/data-management";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";
import { DatasetKey } from "@/types/data-management";

/**
 * POST /api/v1/admin/data-health/retention/preview
 * Executes a strictly non-destructive retention cleanup preview.
 * NEVER deletes records. Returns eligible count, blocked counts, and simulation details.
 */
export async function POST(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/retention/preview" });

    let rawBody: unknown = {};
    try {
      rawBody = await req.json();
    } catch {
      // Body is optional
    }

    const parsed = retentionPreviewSchema.parse(rawBody);

    const preview = await RetentionPolicyService.previewRetentionCleanup({
      adminUserId: admin.id,
      dataset: parsed.dataset as DatasetKey | undefined,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: preview,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/retention/preview" });
    return formatStandardError(error, requestId);
  }
}
