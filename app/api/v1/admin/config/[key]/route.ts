import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { PlatformConfigService } from "@/lib/config/platform-config-service";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";
import { isAllowedConfigKey } from "@/lib/validations/platform-config";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ key: string }>;
}

const patchSingleKeySchema = z.object({
  value: z.union([
    z.boolean(),
    z.string().trim().max(500),
    z.number(),
  ]),
  expectedVersion: z.number().int().min(1).optional(),
});

/**
 * GET /api/v1/admin/config/[key]
 * Retrieves single configuration record.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/config/[key]" });

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    if (!isAllowedConfigKey(decodedKey)) {
      throw new Error(`Invalid configuration key: '${decodedKey}'`);
    }

    const config = await PlatformConfigService.getConfig(decodedKey);

    const response = NextResponse.json({
      success: true,
      data: config,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/config/[key]" });
    return formatStandardError(error, requestId);
  }
}

/**
 * PATCH /api/v1/admin/config/[key]
 * Updates single configuration item.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/config/[key]" });

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_err) {
      throw new Error("Malformed JSON in request body.");
    }

    const { value, expectedVersion } = patchSingleKeySchema.parse(rawBody);

    const updated = await PlatformConfigService.updateConfig(
      admin.id,
      decodedKey,
      value,
      expectedVersion,
      requestId
    );

    const response = NextResponse.json({
      success: true,
      data: updated,
    });
    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/config/[key]" });
    return formatStandardError(error, requestId);
  }
}
