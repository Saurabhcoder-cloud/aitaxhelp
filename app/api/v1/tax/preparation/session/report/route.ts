import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import {
  buildTaxReportFromPreparationSession,
  generateTaxReportDocument,
  generateTaxReportHtml,
} from "@/lib/services/tax-report";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/report
 * Exports a verified Tax Summary Report for the authenticated user's active preparation session.
 * Supports format=html (default, printable), format=json, or format=markdown.
 * Supports download=true for file downloads.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const session = await TaxPreparationSessionStore.getCurrent(user.id);
    if (!session) {
      throw new AppError("No open tax preparation session found.", 404, "NOT_FOUND");
    }

    if (!session.calculationSnapshot) {
      throw new AppError(
        "Run a deterministic tax calculation before generating a tax report.",
        400,
        "CALCULATION_REQUIRED"
      );
    }

    const report = buildTaxReportFromPreparationSession(session);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "html";
    const download = searchParams.get("download") === "true";

    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: report,
      });
    }

    if (format === "markdown") {
      const markdown = generateTaxReportDocument(report);
      const headers: Record<string, string> = {
        "Content-Type": "text/markdown; charset=utf-8",
      };
      if (download) {
        headers["Content-Disposition"] = `attachment; filename="tax-report-${session.taxYear}.md"`;
      }
      return new NextResponse(markdown, { headers });
    }

    // Default: Printable HTML
    const html = generateTaxReportHtml(report);
    const headers: Record<string, string> = {
      "Content-Type": "text/html; charset=utf-8",
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="tax-report-${session.taxYear}.html"`;
    }
    return new NextResponse(html, { headers });
  } catch (error) {
    return handleApiError(error);
  }
}
