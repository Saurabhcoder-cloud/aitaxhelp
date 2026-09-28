import { z } from "zod";
import {
  filingStatusEnum,
  supportedTaxYearSchema,
  incomeTaxInputSchema,
  selfEmployedInputSchema,
  quarterlyTaxInputSchema,
} from "@/tax-engine/validation/schemas";

// Maximum allowable JSON payload sizes in characters
const MAX_INPUT_SNAPSHOT_CHARS = 25000;
const MAX_RESULT_SNAPSHOT_CHARS = 50000;

export const calculationTypeEnum = z.enum([
  "income_tax",
  "self_employed",
  "1099",
  "quarterly_tax",
]);

// Result snapshot schema strictly verifying TaxCalculationResult properties
export const taxCalculationResultSchema = z.object({
  calculationId: z.string().min(1),
  taxYear: supportedTaxYearSchema,
  calculatorType: calculationTypeEnum,
  filingStatus: filingStatusEnum,
  engineVersion: z.string().min(1).max(50),
  rulesVersion: z.string().min(1).max(100),
  calculatedAt: z.string().min(1),

  grossIncomeCents: z.number().int().min(0),
  adjustedGrossIncomeCents: z.number().int().min(0),
  deductionUsedCents: z.number().int().min(0),
  deductionType: z.literal("standard"),
  taxableIncomeCents: z.number().int().min(0),

  federalIncomeTaxCents: z.number().int().min(0),
  selfEmploymentTaxCents: z.number().int().min(0),
  totalTaxLiabilityCents: z.number().int().min(0),

  totalPaymentsAndWithholdingCents: z.number().int().min(0),
  estimatedRefundCents: z.number().int().min(0),
  estimatedAmountOwedCents: z.number().int().min(0),

  effectiveTaxRate: z.number().min(0).max(1),
  marginalTaxBracket: z.number().min(0).max(1),

  bracketBreakdown: z.array(
    z.object({
      rate: z.number(),
      bracketRange: z.string(),
      taxableAmountInBracketCents: z.number().int(),
      taxInBracketCents: z.number().int(),
    })
  ),

  selfEmploymentDetails: z
    .object({
      netSelfEmploymentProfitCents: z.number().int(),
      taxableSelfEmploymentProfitCents: z.number().int(),
      socialSecurityTaxCents: z.number().int(),
      medicareTaxCents: z.number().int(),
      deductibleHalfCents: z.number().int(),
    })
    .optional(),

  quarterlyBreakdown: z
    .object({
      estimatedAnnualTaxCents: z.number().int(),
      remainingTaxToPayCents: z.number().int(),
      quarterlyPaymentCents: z.number().int(),
      paymentDeadlines: z.array(
        z.object({
          quarter: z.string(),
          dueDate: z.string(),
          amountCents: z.number().int(),
        })
      ),
    })
    .optional(),

  warnings: z.array(
    z.object({
      code: z.string(),
      level: z.enum(["info", "warning", "unsupported"]),
      message: z.string(),
    })
  ),
});

// Save calculation request schema
export const saveCalculationRequestSchema = z
  .object({
    calculatorType: calculationTypeEnum,
    taxYear: supportedTaxYearSchema,
    filingStatus: filingStatusEnum,
    title: z.string().trim().max(100).optional(),
    inputSnapshot: z.record(z.unknown()),
    resultSnapshot: taxCalculationResultSchema,
  })
  .superRefine((data, ctx) => {
    // 1. Payload size guardrails
    const inputStr = JSON.stringify(data.inputSnapshot);
    if (inputStr.length > MAX_INPUT_SNAPSHOT_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inputSnapshot"],
        message: `Input snapshot exceeds maximum allowed size (${MAX_INPUT_SNAPSHOT_CHARS} characters).`,
      });
      return;
    }

    const resultStr = JSON.stringify(data.resultSnapshot);
    if (resultStr.length > MAX_RESULT_SNAPSHOT_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resultSnapshot"],
        message: `Result snapshot exceeds maximum allowed size (${MAX_RESULT_SNAPSHOT_CHARS} characters).`,
      });
      return;
    }

    // 2. Validate consistency between request and result snapshot
    if (data.resultSnapshot.calculatorType !== data.calculatorType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resultSnapshot", "calculatorType"],
        message: `Result snapshot calculatorType does not match request calculatorType.`,
      });
    }

    if (data.resultSnapshot.taxYear !== data.taxYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resultSnapshot", "taxYear"],
        message: `Result snapshot taxYear does not match request taxYear.`,
      });
    }

    if (data.resultSnapshot.filingStatus !== data.filingStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resultSnapshot", "filingStatus"],
        message: `Result snapshot filingStatus does not match request filingStatus.`,
      });
    }

    // 3. Strict schema validation for input snapshots according to calculatorType
    let inputValidation;
    if (data.calculatorType === "income_tax") {
      inputValidation = incomeTaxInputSchema.safeParse(data.inputSnapshot);
    } else if (data.calculatorType === "self_employed" || data.calculatorType === "1099") {
      inputValidation = selfEmployedInputSchema.safeParse(data.inputSnapshot);
    } else if (data.calculatorType === "quarterly_tax") {
      inputValidation = quarterlyTaxInputSchema.safeParse(data.inputSnapshot);
    }

    if (inputValidation && !inputValidation.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inputSnapshot"],
        message: `Invalid input snapshot: ${inputValidation.error.issues.map((i) => i.message).join("; ")}`,
      });
    }
  });

export const updateCalculationTitleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(100, "Title cannot exceed 100 characters"),
});

export const calculationIdParamSchema = z
  .string()
  .trim()
  .min(1, "Calculation ID is required")
  .max(64, "Calculation ID is too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid calculation ID format");

export const compareCalculationsRequestSchema = z
  .object({
    calculationIdA: calculationIdParamSchema,
    calculationIdB: calculationIdParamSchema,
  })
  .refine((data) => data.calculationIdA !== data.calculationIdB, {
    message: "Cannot compare a calculation with itself. Please select two distinct calculations.",
    path: ["calculationIdB"],
  });

