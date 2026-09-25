import { z } from "zod";
import { filingStatusEnum, supportedTaxYearSchema } from "@/tax-engine/validation/schemas";
import { taxCalculationResultSchema } from "@/lib/validations/calculation-history";

export const taxIntentCategoryEnum = z.enum([
  "GENERAL_TAX_QUESTION",
  "EXPLAIN_CALCULATION",
  "CALCULATE_TAX",
  "QUARTERLY_ESTIMATE",
  "CALCULATOR_GUIDANCE",
  "UNSUPPORTED_REQUEST",
]);

const MAX_ASSISTANT_REQUEST_PAYLOAD_CHARS = 5000;

export const aiAssistantRequestSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Message cannot be empty")
      .max(1000, "Message cannot exceed 1000 characters"),
    calculationId: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, "Invalid calculation ID format")
      .optional(),
    conversationId: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, "Invalid conversation ID format")
      .optional(),
    // Client may attempt to supply userId or context, but server strictly ignores userId
    userId: z.string().optional(),
    context: z.record(z.unknown()).optional(),
  })
  .strict("Unrecognized fields are not permitted in assistant request")
  .superRefine((data, ctx) => {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_ASSISTANT_REQUEST_PAYLOAD_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["message"],
        message: `Payload exceeds maximum allowable size (${MAX_ASSISTANT_REQUEST_PAYLOAD_CHARS} characters).`,
      });
    }
  });

export const geminiExtractedIntentSchema = z.object({
  intent: taxIntentCategoryEnum,
  confidence: z.number().min(0).max(1),
  calculatorType: z
    .enum(["income_tax", "self_employed", "1099", "quarterly_tax"])
    .optional(),
  extractedParameters: z.object({
    taxYear: supportedTaxYearSchema.optional().default(2025),
    filingStatus: filingStatusEnum.optional().default("single"),
    w2Income: z.number().nonnegative().optional(),
    selfEmploymentIncome: z.number().nonnegative().optional(),
    businessExpenses: z.number().nonnegative().optional(),
    withholding: z.number().nonnegative().optional(),
    itemizedDeductions: z.number().nonnegative().optional(),
    topic: z.string().optional(),
  }),
  missingRequiredFields: z.array(z.string()).default([]),
});

export const aiAssistantResponseSchema = z.object({
  answer: z.string().min(1),
  intent: taxIntentCategoryEnum,
  calculation: z
    .object({
      result: taxCalculationResultSchema,
      engineVersion: z.string().min(1),
      rulesVersion: z.string().min(1),
      isHistorical: z.boolean().optional(),
    })
    .optional(),
  suggestedActions: z
    .array(
      z.object({
        label: z.string(),
        href: z.string().optional(),
        action: z.string().optional(),
      })
    )
    .optional(),
  warnings: z.array(z.string()).optional(),
  conversationId: z.string().min(1),
});

export type AIAssistantRequestValidated = z.infer<typeof aiAssistantRequestSchema>;
export type GeminiExtractedIntent = z.infer<typeof geminiExtractedIntentSchema>;
export type AIAssistantResponseValidated = z.infer<typeof aiAssistantResponseSchema>;
