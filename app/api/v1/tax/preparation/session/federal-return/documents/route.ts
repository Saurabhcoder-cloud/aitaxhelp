import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturnDocumentPackage } from "@/lib/preparation/federal-return-documents";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/federal-return/documents
 * Returns the Federal Return Document Package metadata, schedule statuses,
 * readiness evaluation, and download descriptors for the authenticated taxpayer's session.
 *
 * SECURITY: User identity is extracted exclusively from the authenticated session.
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

    const documentPackage = buildFederalReturnDocumentPackage(session);

    return NextResponse.json({
      success: true,
      data: documentPackage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/tax/preparation/session/federal-return/documents
 * Generates/refreshes the return document package descriptors.
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
