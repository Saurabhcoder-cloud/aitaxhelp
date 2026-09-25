import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { saveCalculationRequestSchema } from "@/lib/validations/calculation-history";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { TaxCalculationRecord, CalculatorType, TaxYear } from "@/types/tax";

function generateDefaultTitle(calculatorType: CalculatorType, taxYear: TaxYear): string {
  switch (calculatorType) {
    case "income_tax":
      return `${taxYear} Income Tax Calculation`;
    case "self_employed":
      return `${taxYear} Self-Employed Tax Calculation`;
    case "1099":
      return `${taxYear} 1099 Contractor Tax Calculation`;
    case "quarterly_tax":
      return `${taxYear} Quarterly Estimated Tax Calculation`;
    default:
      return `${taxYear} Tax Calculation`;
  }
}

/**
 * POST /api/v1/tax/calculations
 * Saves a deterministic tax calculation snapshot.
 * SECURITY: User identity is extracted exclusively from verified auth session.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to save calculations.", 401, "UNAUTHORIZED");
    }

    const rawBody = await req.json();
    const validated = saveCalculationRequestSchema.parse(rawBody);

    const now = new Date().toISOString();
    const defaultTitle = generateDefaultTitle(validated.calculatorType, validated.taxYear);

    const record: TaxCalculationRecord = {
      id: crypto.randomUUID(),
      userId: user.id, // Strictly derived from server auth session
      calculatorType: validated.calculatorType,
      taxYear: validated.taxYear,
      filingStatus: validated.filingStatus,
      title: validated.title && validated.title.trim().length > 0 ? validated.title.trim() : defaultTitle,
      inputSnapshot: validated.inputSnapshot,
      resultSnapshot: validated.resultSnapshot,
      engineVersion: validated.resultSnapshot.engineVersion,
      rulesVersion: validated.resultSnapshot.rulesVersion,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await TaxCalculationStore.save(record);

    return NextResponse.json(
      {
        success: true,
        data: saved,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/v1/tax/calculations
 * Lists all historical calculations belonging to the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to access calculation history.", 401, "UNAUTHORIZED");
    }

    const calculations = await TaxCalculationStore.listByUser(user.id);

    return NextResponse.json({
      success: true,
      data: calculations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
