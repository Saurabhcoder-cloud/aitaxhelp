import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { Metrics } from "@/lib/observability/metrics";
import { TaxEngineMonitor } from "@/lib/operations/tax-engine-monitoring";
import { AiMonitor } from "@/lib/operations/ai-monitoring";
import { BillingMonitor } from "@/lib/operations/billing-monitoring";
import { EmailMonitor } from "@/lib/operations/email-monitoring";
import { SupportMonitor } from "@/lib/operations/support-monitoring";
import { getOrGenerateRequestId, withRequestId } from "@/lib/observability/request-id";
import { formatStandardError } from "@/lib/observability/errors";

/**
 * GET /api/v1/admin/operations/performance
 * Returns aggregate subsystem performance and timing statistics.
 */
export async function GET(req: NextRequest) {
  const requestId = getOrGenerateRequestId(req);

  try {
    await requireAdmin(req);
    Metrics.increment("api_request_total", 1, { endpoint: "/api/v1/admin/operations/performance" });

    const metricsSnapshot = Metrics.getSnapshot();
    const taxEngineSnapshot = TaxEngineMonitor.getSnapshot();
    const aiSnapshot = AiMonitor.getSnapshot();
    const billingSnapshot = BillingMonitor.getSnapshot();
    const emailSnapshot = EmailMonitor.getSnapshot();
    const supportMetrics = await SupportMonitor.getMetrics();

    const response = NextResponse.json(
      {
        success: true,
        data: {
          metrics: {
            counters: metricsSnapshot.counters,
            timings: metricsSnapshot.timings,
          },
          taxEngine: taxEngineSnapshot,
          ai: aiSnapshot,
          billing: billingSnapshot,
          email: emailSnapshot,
          support: supportMetrics,
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );

    return withRequestId(response, requestId);
  } catch (error) {
    Metrics.increment("api_request_failed", 1, { endpoint: "/api/v1/admin/operations/performance" });
    return formatStandardError(error, requestId);
  }
}
