import { z } from "zod";
import { filingStatusEnum, supportedTaxYearSchema } from "../../../tax-engine/validation/schemas";

export const geminiExtractedIntentSchema = z.object({
  intent: z.enum([
    "calculate_tax",
    "ask_question",
    "explain_deduction",
    "quarterly_estimate",
    "unknown",
  ]),
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

export const geminiExplanationSchema = z.object({
  summary: z.string(),
  breakdownExplanation: z.array(z.string()),
  actionableInsights: z.array(z.string()),
  disclaimers: z.array(z.string()),
});

export type GeminiExtractedIntent = z.infer<typeof geminiExtractedIntentSchema>;
export type GeminiExplanation = z.infer<typeof geminiExplanationSchema>;
