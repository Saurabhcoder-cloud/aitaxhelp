import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { compareCalculationsRequestSchema } from "@/lib/validations/calculation-history";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { compareSavedCalculations } from "@/lib/services/tax-insights";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/calculations/compare
 * Compares two deterministic calculation snapshots owned by the authenticated user.
 *
 * SECURITY:
 * 1. User identity is extracted exclusively from the verified auth session.
 * 2. Cross-user calculation comparison is strictly prevented by TaxCalculationStore.getById(id, userId).
 * 3. Both calculations must belong to the caller.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to compare calculations.", 401, "UNAUTHORIZED");
    }

    const rawBody = await req.json();
    const validated = compareCalculationsRequestSchema.parse(rawBody);

    const [calcA, calcB] = await Promise.all([
      TaxCalculationStore.getById(validated.calculationIdA, user.id),
      TaxCalculationStore.getById(validated.calculationIdB, user.id),
    ]);

    if (!calcA || !calcB) {
      throw new AppError(
        "One or both calculations were not found or access is denied.",
        404,
        "NOT_FOUND"
      );
    }

    const comparisonResult = compareSavedCalculations(calcA, calcB);

    return NextResponse.json({
      success: true,
      data: comparisonResult,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/v1/tax/calculations/compare?a={idA}&b={idB}
 * Query-param alternative for direct navigation and sharing within the user's session.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to compare calculations.", 401, "UNAUTHORIZED");
    }

    const searchParams = req.nextUrl.searchParams;
    const rawInput = {
      calculationIdA: searchParams.get("a") || "",
      calculationIdB: searchParams.get("b") || "",
    };

    const validated = compareCalculationsRequestSchema.parse(rawInput);

    const [calcA, calcB] = await Promise.all([
      TaxCalculationStore.getById(validated.calculationIdA, user.id),
      TaxCalculationStore.getById(validated.calculationIdB, user.id),
    ]);

    if (!calcA || !calcB) {
      throw new AppError(
        "One or both calculations were not found or access is denied.",
        404,
        "NOT_FOUND"
      );
    }

    const comparisonResult = compareSavedCalculations(calcA, calcB);

    return NextResponse.json({
      success: true,
      data: comparisonResult,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
