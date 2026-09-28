import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { PlatformConfigService } from "@/lib/config/platform-config-service";
import { updateConfigItemSchema } from "@/lib/validations/platform-config";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/config
 * Retrieves all configuration items.
 *
 * SECURITY:
 * Strictly requires admin authorization (requireAdmin).
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/config" });

    const configs = await PlatformConfigService.getAllConfigs();

    const response = NextResponse.json({
      success: true,
      data: configs,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/config" });
    return formatStandardError(error, requestId);
  }
}

/**
 * PATCH /api/v1/admin/config
 * Updates a configuration item with optimistic concurrency validation.
 */
export async function PATCH(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/config" });

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_err) {
      throw new Error("Malformed JSON in request body.");
    }

    const { key, value, expectedVersion } = updateConfigItemSchema.parse(rawBody);

    const updated = await PlatformConfigService.updateConfig(
      admin.id,
      key,
      value,
      expectedVersion,
      requestId
    );

    const response = NextResponse.json({
      success: true,
      data: updated,
      requestId,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/config" });
    return formatStandardError(error, requestId);
  }
}
