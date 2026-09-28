import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { deductionDiscoveryInputSchema } from "@/lib/validations/preparation-deductions";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * PUT /api/v1/tax/preparation/session/deductions
 * Saves deduction discovery answers. This route does not calculate tax.
 * SECURITY: userId in the body is rejected by the strict schema.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const parsed = deductionDiscoveryInputSchema.parse(await readJson(req));
    const session = await TaxPreparationSessionStore.saveDeductions(user.id, parsed);
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return handleApiError(error);
  }
}

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    const text = await req.text();
    if (!text.trim()) return {};
    return JSON.parse(text);
  } catch {
    throw new AppError("Request body must be valid JSON.", 400, "INVALID_JSON");
  }
}
