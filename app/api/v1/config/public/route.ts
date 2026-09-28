import { NextRequest, NextResponse } from "next/server";
import { PlatformConfigService } from "@/lib/config/platform-config-service";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/config/public
 * Sanitized public configuration endpoint.
 *
 * CRITICAL PRIVACY INVARIANT:
 * Strictly exposes only non-sensitive public flags, announcements, and maintenance status.
 * Never leaks administrative settings, database details, or credentials.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/config/public" });

    const publicConfig = await PlatformConfigService.getPublicConfig();

    const response = NextResponse.json({
      success: true,
      data: publicConfig,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/config/public" });
    return formatStandardError(error, requestId);
  }
}
