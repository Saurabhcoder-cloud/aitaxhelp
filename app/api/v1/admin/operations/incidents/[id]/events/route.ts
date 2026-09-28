import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { IncidentStore } from "@/lib/operations/incident-store";
import { addIncidentEventSchema } from "@/lib/validations/operations";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";

/**
 * POST /api/v1/admin/operations/incidents/[id]/events
 * Appends a new timestamped event to an incident timeline.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/incidents/events" });

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new Error("Malformed JSON in request body.");
    }

    const parsed = addIncidentEventSchema.parse(rawBody);

    const event = IncidentStore.addEvent(
      params.id,
      admin.id,
      parsed.eventType,
      parsed.note
    );

    const response = NextResponse.json(
      {
        success: true,
        data: event,
      },
      { status: 201 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/incidents/events" });
    return formatStandardError(error, requestId);
  }
}
