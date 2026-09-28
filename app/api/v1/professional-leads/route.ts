import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createProfessionalLeadSchema } from "@/lib/validations/professional-lead";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import {
  ProfessionalLeadStore,
  ProfessionalLeadRecord,
} from "@/lib/services/professional-lead-store";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { FeatureFlags } from "@/lib/services/feature-flags";

/**
 * POST /api/v1/professional-leads
 * Submits an authenticated request to share a saved calculation with a certified CPA/EA.
 *
 * SECURITY:
 * 1. User identity is derived strictly from the server session; client cannot override userId.
 * 2. Calculation ownership is verified: user can only hand off calculations they own.
 * 3. Deduplication protects against repeated accidental double-submissions.
 * 4. Feature flag authority: respects central platform configuration.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError(
        "Authentication required to connect with a tax professional.",
        401,
        "UNAUTHORIZED"
      );
    }

    // Check central feature flag
    await FeatureFlags.require("professionals.handoff_enabled", "Professional CPA/EA Handoff");

    const rawBody = await req.json();
    const validated = createProfessionalLeadSchema.parse(rawBody);

    // Verify calculation ownership
    const calculation = await TaxCalculationStore.getById(validated.calculationId, user.id);
    if (!calculation) {
      throw new AppError(
        "Referenced calculation was not found or access is denied.",
        404,
        "NOT_FOUND"
      );
    }

    // Check for recent duplicate submission within 5 minutes
    const existing = await ProfessionalLeadStore.findRecentDuplicate(
      user.id,
      validated.calculationId,
      validated.email
    );
    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: "Your inquiry for this calculation was already received and is being processed.",
      });
    }

    const now = new Date().toISOString();
    const leadRecord: ProfessionalLeadRecord = {
      id: crypto.randomUUID(),
      userId: user.id, // Strictly derived from server auth session
      calculationId: validated.calculationId,
      taxYear: calculation.taxYear,
      filingStatus: calculation.filingStatus,
      taxpayerName: validated.taxpayerName,
      email: validated.email,
      phone: validated.phone || undefined,
      message: validated.message || undefined,
      preferredContactMethod: validated.preferredContactMethod,
      urgency: validated.urgency,
      status: "new",
      createdAt: now,
      updatedAt: now,
    };

    const saved = await ProfessionalLeadStore.save(leadRecord);

    return NextResponse.json(
      {
        success: true,
        data: saved,
        message: "Your inquiry has been submitted. A qualified CPA or Enrolled Agent will review your calculation summary.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/v1/professional-leads
 * Retrieves submitted leads owned by the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const leads = await ProfessionalLeadStore.listByUser(user.id);

    return NextResponse.json({
      success: true,
      data: leads,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
