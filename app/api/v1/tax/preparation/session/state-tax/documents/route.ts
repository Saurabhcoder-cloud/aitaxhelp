import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { buildStateTaxSummary } from "@/lib/state-tax/summary";
import { getStateDocumentProvider } from "@/lib/state-tax/documents";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/state-tax/documents
 * Generates the state document package (State Tax Preparation Summary / Exemption Certificate / Advisory Notice).
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

    const federalReturn = buildFederalReturn(session);
    const summary = buildStateTaxSummary(session, federalReturn);
    const docProvider = getStateDocumentProvider(summary.stateCode);
    const documentPackage = docProvider.generateDocumentPackage(summary);

    return NextResponse.json({
      success: true,
      data: documentPackage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
