import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { RestoreVerificationService } from "@/lib/data/restore-verification";
import { recoveryVerifySchema } from "@/lib/validations/data-management";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * POST /api/v1/admin/data-health/recovery/verify
 * Explicit trigger for non-destructive restore drill verification.
 */
export async function POST(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/data-health/recovery/verify" });

    let rawBody: unknown = {};
    try {
      rawBody = await req.json();
    } catch {
      // Body is optional
    }

    const parsed = recoveryVerifySchema.parse(rawBody);

    const report = await RestoreVerificationService.runVerification({
      triggeredBy: admin.id,
      simulateDrill: parsed.simulateDrill ?? true,
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
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/data-health/recovery/verify" });
    return formatStandardError(error, requestId);
  }
}
