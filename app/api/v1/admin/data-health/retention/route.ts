import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { RetentionPolicyService } from "@/lib/data/retention-policy";
import { LegalHoldService } from "@/lib/data/legal-hold";
import { DATA_CATALOG } from "@/lib/data/data-catalog";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/data-health/retention
 * Returns policy configuration overview, legal hold totals, and dataset retention metadata.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/retention" });

    const activeHolds = await LegalHoldService.getActiveHolds();
    const datasets = Object.values(DATA_CATALOG).map((item) => ({
      key: item.key,
      category: item.category,
      sensitivity: item.sensitivity,
      retentionMode: item.retentionMode,
      retentionPeriodDays: item.retentionPeriodDays,
      legalHoldSupported: item.legalHoldSupported,
      userDeletionBehavior: item.userDeletionBehavior,
      exportBehavior: item.exportBehavior,
      cleanupEligibility: item.cleanupEligibility,
      hasTaxpayerData: item.hasTaxpayerData,
    }));

    const response = NextResponse.json(
      {
        success: true,
        data: {
          datasets,
          activeLegalHoldsCount: activeHolds.length,
          activeLegalHolds: activeHolds.map((h) => ({
            id: h.id,
            dataset: h.dataset,
            recordId: h.recordId,
            reason: h.reason,
            createdAt: h.createdAt,
            createdBy: h.createdBy,
          })),
        },
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/retention" });
    return formatStandardError(error, requestId);
  }
}

/**
 * POST /api/v1/admin/data-health/retention
 * Also routes to retention cleanup dry-run preview.
 */
export async function POST(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/retention" });

    let body: { dataset?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable for full inventory preview
    }

    const preview = await RetentionPolicyService.previewRetentionCleanup({
      adminUserId: admin.id,
      dataset: typeof body.dataset === "string" ? (body.dataset as any) : undefined,
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
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/retention" });
    return formatStandardError(error, requestId);
  }
}
