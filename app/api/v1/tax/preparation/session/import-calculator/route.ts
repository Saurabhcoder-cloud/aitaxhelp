import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { importCalculatorSessionSchema } from "@/lib/validations/preparation-session";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/import-calculator
 *
 * Imports validated inputs from standalone free calculators into the user's
 * tax preparation session.
 *
 * SECURITY & INVARIANTS:
 * - Deterministic tax engine remains the sole computation authority.
 * - Client calculated tax totals are NEVER accepted or trusted.
 * - Only raw inputs (wages, 1099 gross, withholding, status, year) are transferred.
 * - Requires authentication.
 * - Checks for existing preparation data and requests confirmation before overwriting.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to import calculation into preparation.", 401, "UNAUTHORIZED");
    }

    let rawBody: unknown;
    try {
      const text = await req.text();
      rawBody = text.trim() ? JSON.parse(text) : {};
    } catch (_err) {
      throw new AppError("Malformed JSON in request body.", 400, "BAD_REQUEST");
    }

    const validated = importCalculatorSessionSchema.parse(rawBody);

    const result = await TaxPreparationSessionStore.importFromCalculator(
      user.id,
      validated,
      user.email
    );

    return NextResponse.json({
      success: true,
      data: result.session,
      requiresConfirmation: result.requiresConfirmation,
      reason: result.reason,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
