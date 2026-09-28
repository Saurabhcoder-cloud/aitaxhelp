import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { EntitlementService } from "@/lib/services/entitlement-service";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { buildTaxReport } from "@/lib/services/tax-report";
import { TaxReportAnalyticsStore } from "@/lib/services/tax-report-analytics-store";
import { UsageStore } from "@/lib/services/usage-store";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { z } from "zod";

const premiumReportSchema = z.object({
  calculationId: z.string().uuid("A valid calculation ID is required."),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    // 1. Strictly enforce server-side entitlement
    await EntitlementService.requireEntitlement(user.id, "report.premium");

    const rawBody = await req.json();
    const validated = premiumReportSchema.parse(rawBody);

    // 2. Enforce row ownership of the calculation
    const calculation = await TaxCalculationStore.getById(validated.calculationId, user.id);
    if (!calculation) {
      throw new AppError("Referenced calculation was not found or access is denied.", 404, "NOT_FOUND");
    }

    // 3. Build unlocked paid report snapshot
    const report = buildTaxReport(calculation, "paid");

    // 4. Record operational event and usage
    await Promise.all([
      TaxReportAnalyticsStore.recordEvent({
        calculationId: calculation.id,
        userId: user.id,
        taxYear: calculation.taxYear,
        calculatorType: calculation.calculatorType,
        accessTier: "paid",
      }),
      UsageStore.incrementUsage(user.id, "premium_reports", 1),
    ]);

    return NextResponse.json({
      success: true,
      data: report,
      message: "Premium tax summary report compiled successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
