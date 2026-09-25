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

const calculateRequestSchema = z.discriminatedUnion("calculatorType", [
  z.object({
    calculatorType: z.literal("income_tax"),
    payload: incomeTaxInputSchema,
  }),
  z.object({
    calculatorType: z.literal("self_employed"),
    payload: selfEmployedInputSchema,
  }),
  z.object({
    calculatorType: z.literal("1099"),
    payload: selfEmployedInputSchema,
  }),
  z.object({
    calculatorType: z.literal("quarterly_tax"),
    payload: quarterlyTaxInputSchema,
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validated = calculateRequestSchema.parse(rawBody);

    let result;

    switch (validated.calculatorType) {
      case "income_tax":
        result = calculateIncomeTax(validated.payload);
        break;
      case "self_employed":
      case "1099":
        result = calculateSelfEmployedTax(validated.payload);
        break;
      case "quarterly_tax":
        result = calculateQuarterlyTax(validated.payload);
        break;
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
