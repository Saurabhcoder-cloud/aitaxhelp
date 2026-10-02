import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { householdInputSchema } from "@/lib/validations/preparation-household";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * PUT /api/v1/tax/preparation/session/household
 * Saves household details (filing status, spouse, dependents) on the authenticated user's open preparation session.
 * SECURITY: Session is keyed strictly by server-verified user ID.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const rawBody = await readJson(req);
    const household = householdInputSchema.parse(rawBody);
    const session = await TaxPreparationSessionStore.saveHousehold(user.id, household);

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/tax/preparation/session/household
 * Equivalent alias for clients using POST.
 */
export async function POST(req: NextRequest) {
  return PUT(req);
}

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    const text = await req.text();
    if (!text.trim()) {
      return {};
    }
    return JSON.parse(text);
  } catch {
    throw new AppError("Request body must be valid JSON.", 400, "INVALID_JSON");
  }
}
