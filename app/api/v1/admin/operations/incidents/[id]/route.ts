import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { IncidentStore } from "@/lib/operations/incident-store";
import { updateIncidentSchema } from "@/lib/validations/operations";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * GET /api/v1/admin/operations/incidents/[id]
 * Retrieves incident details and event timeline.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/incidents/detail" });

    const incident = await IncidentStore.getIncident(params.id);
    if (!incident) {
      return withRequestId(
        NextResponse.json(
          { success: false, error: { message: "Incident not found.", code: "INCIDENT_NOT_FOUND" } },
          { status: 404 }
        ),
        requestId
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        data: incident,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/incidents/detail" });
    return formatStandardError(error, requestId);
  }
}

/**
 * PATCH /api/v1/admin/operations/incidents/[id]
 * Updates incident properties or transitions status.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/incidents/update" });

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new Error("Malformed JSON in request body.");
    }

    const parsed = updateIncidentSchema.parse(rawBody);

    const updated = await IncidentStore.updateIncident(params.id, {
      ...parsed,
      actor: admin.id,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/incidents/update" });
    return formatStandardError(error, requestId);
  }
}
