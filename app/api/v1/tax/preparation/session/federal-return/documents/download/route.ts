import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import {
  buildFederalReturn,
  evaluateFederalReturnReadiness,
  reconcileFederalReturnCalculations,
} from "@/lib/preparation/federal-return";
import { sanitizeTaxDocumentFilename } from "@/lib/preparation/federal-return-documents";
import {
  generateFederalTaxSummaryPdf,
  generateForm1040SummaryPdf,
  generateProfessionalReviewPackagePdf,
} from "@/lib/preparation/federal-return-pdf";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/federal-return/documents/download
 * Query parameters:
 *   - docType: "summary" | "1040" | "cpa_review"
 *   - inline: "true" | "false" (optional, defaults to attachment download)
 *
 * Streams the generated vector PDF document on-demand over authenticated HTTPS.
 * Strictly gated behind deterministic readiness & calculation reconciliation checks.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to download tax documents.", 401, "UNAUTHORIZED");
    }

    const session = await TaxPreparationSessionStore.getCurrent(user.id);
    if (!session) {
      throw new AppError("No open tax preparation session found.", 404, "NOT_FOUND");
    }

    // 1. Strict Readiness & Reconciliation Gating
    const readiness = evaluateFederalReturnReadiness(session);
    const reconciliation = reconcileFederalReturnCalculations(session);

    if (!readiness.isReadyForReview || !reconciliation.isReconciled) {
      const blockers = [
        ...readiness.summaryBlockingItems,
        ...reconciliation.mismatches,
      ];
      throw new AppError(
        `Cannot download tax documents while return preparation is incomplete or has reconciliation discrepancies. (${blockers.length} issue(s) remaining)`,
        403,
        "PREPARATION_BLOCKED"
      );
    }

    // 2. Canonical Deterministic FederalReturn Aggregate
    const federalReturn = buildFederalReturn(session);

    // 3. Resolve Document Type
    const { searchParams } = new URL(req.url);
    const docType = searchParams.get("docType") || "summary";
    const isInline = searchParams.get("inline") === "true";

    let pdfBytes: Uint8Array;
    let filename: string;

    switch (docType) {
      case "summary":
        pdfBytes = await generateFederalTaxSummaryPdf(federalReturn);
        filename = sanitizeTaxDocumentFilename(session.taxYear, "federal_tax_summary", "pdf");
        break;

      case "1040":
        pdfBytes = await generateForm1040SummaryPdf(federalReturn);
        filename = sanitizeTaxDocumentFilename(session.taxYear, "form_1040_preparation", "pdf");
        break;

      case "cpa_review":
        pdfBytes = await generateProfessionalReviewPackagePdf(federalReturn);
        filename = sanitizeTaxDocumentFilename(session.taxYear, "professional_review_package", "pdf");
        break;

      default:
        throw new AppError(
          `Invalid document type '${docType}'. Supported types are 'summary', '1040', and 'cpa_review'.`,
          400,
          "INVALID_DOCUMENT_TYPE"
        );
    }

    const disposition = isInline
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    // 4. Stream response with strict privacy & security headers
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": pdfBytes.byteLength.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
