import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { createFinalReturnSnapshot } from "@/lib/preparation/final-return-snapshot";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/federal-return/efile/freeze
 * Creates an immutable, cryptographically hashed snapshot of the complete federal return.
 *
 * CRITICAL SAFETY & SECURITY:
 * - All numbers are computed strictly server-side from verified session state.
 * - Client cannot pass totals, override numbers, or alter return values.
 * - Gated strictly behind 100% e-file readiness and mathematical reconciliation.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const session = await TaxPreparationSessionStore.getCurrent(user.id);
    if (!session) {
      throw new AppError("No open tax preparation session found.", 404, "NOT_FOUND");
    }

    const snapshot = createFinalReturnSnapshot(session);

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
