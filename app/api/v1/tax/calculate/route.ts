import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  calculateIncomeTax,
  calculateSelfEmployedTax,
  calculateQuarterlyTax,
} from "@/tax-engine";
import {
  incomeTaxInputSchema,
  selfEmployedInputSchema,
  quarterlyTaxInputSchema,
} from "@/tax-engine/validation/schemas";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { getAuthenticatedUser } from "@/lib/auth/session";

/**
 * Flat request schema: calculatorType + all input fields at the top level.
 * The canonical API shape for POST /api/v1/tax/calculate is a discriminated
 * union where calculatorType sits alongside the input fields, not nested in
 * a `payload` sub-object.
 */
const calculateRequestSchema = z.discriminatedUnion("calculatorType", [
  incomeTaxInputSchema.extend({ calculatorType: z.literal("income_tax") }),
  selfEmployedInputSchema.extend({ calculatorType: z.literal("self_employed") }),
  selfEmployedInputSchema.extend({ calculatorType: z.literal("1099") }),
  quarterlyTaxInputSchema.extend({ calculatorType: z.literal("quarterly_tax") }),
]);

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to run a tax calculation.", 401, "UNAUTHORIZED");
    }

    const rawBody = await req.json();
    const validated = calculateRequestSchema.parse(rawBody);

    let result;

    switch (validated.calculatorType) {
      case "income_tax": {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { calculatorType: _ct, ...input } = validated;
        result = calculateIncomeTax(input);
        break;
      }
      case "self_employed":
      case "1099": {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { calculatorType: _ct, ...input } = validated;
        result = calculateSelfEmployedTax(input);
        break;
      }
      case "quarterly_tax": {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { calculatorType: _ct, ...input } = validated;
        result = calculateQuarterlyTax(input);
        break;
      }
      default:
        throw new AppError("Invalid calculator type specified.", 400);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
