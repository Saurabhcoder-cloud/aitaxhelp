import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { IncidentStore } from "@/lib/operations/incident-store";
import { createIncidentSchema } from "@/lib/validations/operations";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";
import { Metrics } from "@/lib/observability/metrics";
import { IncidentStatus } from "@/types/operations";

/**
 * GET /api/v1/admin/operations/incidents
 * Lists all registered incidents, optionally filtered by status (?status=INVESTIGATING).
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/incidents" });

    const statusParam = req.nextUrl.searchParams.get("status") as IncidentStatus | null;
    const incidents = await IncidentStore.getAllIncidents(statusParam || undefined);

    const response = NextResponse.json(
      {
        success: true,
        data: incidents,
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/incidents" });
    return formatStandardError(error, requestId);
  }
}

/**
 * POST /api/v1/admin/operations/incidents
 * Registers a new operational incident with audit trail logging.
 */
export async function POST(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    const admin = await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/incidents" });

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new Error("Malformed JSON in request body.");
    }

    const parsed = createIncidentSchema.parse(rawBody);

    const incident = await IncidentStore.createIncident({
      title: parsed.title,
      severity: parsed.severity,
      service: parsed.service,
      summary: parsed.summary,
      createdBy: admin.id,
      assignedTo: parsed.assignedTo,
      customerImpact: parsed.customerImpact,
      internalNotes: parsed.internalNotes,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: incident,
      },
      { status: 201 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/incidents" });
    return formatStandardError(error, requestId);
  }
}
