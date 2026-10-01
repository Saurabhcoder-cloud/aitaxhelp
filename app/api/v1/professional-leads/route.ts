import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createProfessionalLeadSchema } from "@/lib/validations/professional-lead";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import {
  ProfessionalLeadStore,
  ProfessionalLeadRecord,
  ProfessionalLeadSessionSnapshot,
} from "@/lib/services/professional-lead-store";
import { listIncomeSources } from "@/lib/preparation/income";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { TaxYear, TaxFilingStatus } from "@/types/tax";
import { FeatureFlags } from "@/lib/services/feature-flags";

/**
 * POST /api/v1/professional-leads
 * Submits an authenticated request to share a calculation or tax preparation session with a certified CPA/EA.
 *
 * SECURITY:
 * 1. User identity is derived strictly from the server session; client cannot override userId.
 * 2. Session and Calculation ownership is verified: user can only hand off records they own.
 * 3. Deduplication protects against repeated accidental double-submissions.
 * 4. Audit trail recorded server-side for all review requests.
 * 5. Feature flag authority: respects central platform configuration.
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

    // Business rule 1: Missing calculation or session is rejected with HTTP 400
    if (!validated.calculationId && !validated.sessionId) {
      throw new AppError(
        "Either calculationId or sessionId must be provided.",
        400,
        "BAD_REQUEST"
      );
    }

    // Business rule 2: Professional review for a preparation session requires explicit consent (HTTP 400)
    if (validated.sessionId && validated.consentGiven !== true) {
      throw new AppError(
        "You must consent to professional human review terms.",
        400,
        "BAD_REQUEST"
      );
    }

    let resolvedCalculationId = validated.calculationId;
    let taxYear: TaxYear = 2025;
    let filingStatus: TaxFilingStatus = "single";
    let sessionSnapshot: ProfessionalLeadSessionSnapshot | undefined;

    // 1. Session Linkage (if sessionId is provided)
    if (validated.sessionId) {
      const session = await TaxPreparationSessionStore.getCurrent(user.id);
      if (!session || (validated.sessionId !== "current" && session.id !== validated.sessionId)) {
        throw new AppError(
          "Referenced preparation session was not found or access is denied.",
          404,
          "NOT_FOUND"
        );
      }

      if (!session.calculationSnapshot) {
        throw new AppError(
          "Run a deterministic tax calculation before requesting professional review.",
          400,
          "CALCULATION_REQUIRED"
        );
      }

      resolvedCalculationId = session.calculationId || validated.calculationId || undefined;
      taxYear = session.taxYear;
      filingStatus = session.profileSnapshot.filingStatus;

      const w2Withholding = session.incomeSnapshot.w2s.reduce((sum, w) => sum + w.federalWithholdingCents, 0);
      const form1099Withholding = session.incomeSnapshot.form1099s.reduce((sum, f) => sum + f.federalWithholdingCents, 0);

      sessionSnapshot = {
        sessionId: session.id,
        taxYear: session.taxYear,
        filingStatus: session.profileSnapshot.filingStatus,
        incomeSources: listIncomeSources(session.incomeSnapshot).map((s) => s.label),
        w2Count: session.incomeSnapshot.w2s.length,
        totalW2WagesCents: session.situationSummary.whatYouToldUs.w2WagesCents,
        totalW2WithholdingCents: w2Withholding,
        w2WagesCents: session.situationSummary.whatYouToldUs.w2WagesCents,
        form1099Count: session.incomeSnapshot.form1099s.length,
        total1099GrossCents: session.situationSummary.whatYouToldUs.form1099GrossCents,
        total1099WithholdingCents: form1099Withholding,
        form1099GrossCents: session.situationSummary.whatYouToldUs.form1099GrossCents,
        gigCount: session.incomeSnapshot.activities.length,
        gigGrossCents: session.situationSummary.whatYouToldUs.gigBusinessGrossCents,
        gigExpenseCents: session.situationSummary.whatYouToldUs.expenseCents,
        gigBusinessGrossCents: session.situationSummary.whatYouToldUs.gigBusinessGrossCents,
        businessExpenseCents: session.situationSummary.whatYouToldUs.expenseCents,
        deductionsType: "standard",
        uploadedDocumentsCount: session.documentsSnapshot.documents.filter((d) => d.status === "received").length,
        missingDocumentTypes: session.documentsSnapshot.documents
          .filter((d) => d.status === "missing" || d.status === "expected")
          .map((d) => d.displayName),
        documentsReceived: session.situationSummary.informationReceived,
        documentsStillNeeded: session.situationSummary.informationStillNeeded,
        standardDeductionAcknowledged: session.deductionsSnapshot.standardDeductionAcknowledged,
        totalIncomeCents: session.calculationSnapshot.grossIncomeCents,
        taxableIncomeCents: session.calculationSnapshot.taxableIncomeCents,
        totalTaxLiabilityCents: session.calculationSnapshot.totalTaxLiabilityCents,
        refundOrBalanceDue: session.situationSummary.calculation?.refundOrBalanceDue,
        calculationResult: {
          totalIncomeCents: session.calculationSnapshot.grossIncomeCents,
          taxableIncomeCents: session.calculationSnapshot.taxableIncomeCents,
          totalTaxLiabilityCents: session.calculationSnapshot.totalTaxLiabilityCents,
          refundOrBalanceDue: session.situationSummary.calculation?.refundOrBalanceDue,
        },
        warnings: session.situationSummary.warnings,
        missingInformation: session.situationSummary.informationStillNeeded,
      };
    } else if (validated.calculationId) {
      // 2. Standalone Calculation Linkage
      const calculation = await TaxCalculationStore.getById(validated.calculationId, user.id);
      if (!calculation) {
        throw new AppError(
          "Referenced calculation was not found or access is denied.",
          404,
          "NOT_FOUND"
        );
      }
      taxYear = calculation.taxYear;
      filingStatus = calculation.filingStatus;
    }

    // Check for recent duplicate submission within 5 minutes
    const existing = await ProfessionalLeadStore.findRecentDuplicate(
      user.id,
      resolvedCalculationId,
      validated.email,
      validated.sessionId
    );
    if (existing) {
      if (validated.sessionId) {
        throw new AppError(
          "A review request for this preparation session was already submitted within the last 5 minutes.",
          409,
          "DUPLICATE_LEAD"
        );
      }

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
      calculationId: resolvedCalculationId,
      sessionId: validated.sessionId,
      reviewType: validated.reviewType || "cpa",
      taxYear,
      filingStatus,
      taxpayerName: validated.taxpayerName,
      email: validated.email,
      phone: validated.phone || undefined,
      message: validated.message || undefined,
      preferredContactMethod: validated.preferredContactMethod,
      urgency: validated.urgency,
      status: "requested",
      sessionSnapshot,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await ProfessionalLeadStore.save(leadRecord);

    // Audit log privileged action
    await AuditLogStore.log({
      userId: user.id,
      action: "professional_review_requested",
      targetType: "professional_lead",
      targetId: saved.id,
      metadata: {
        reviewType: saved.reviewType,
        taxYear: saved.taxYear,
        calculationId: saved.calculationId,
        sessionId: saved.sessionId,
      },
    });

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
 * Supports ?sessionId=... to get the active lead for a specific preparation session.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const lead = await ProfessionalLeadStore.getBySessionId(sessionId, user.id);
      return NextResponse.json({
        success: true,
        data: lead,
      });
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
