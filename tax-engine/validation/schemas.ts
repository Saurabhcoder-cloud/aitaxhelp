import { z } from "zod";

export const filingStatusEnum = z.enum([
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_surviving_spouse",
]);

export const supportedTaxYearSchema = z.union([
  z.literal(2026),
  z.literal(2025),
  z.literal(2024),
  z.literal(2023),
]);

// Income Tax Form Schema (Integer cents)
export const incomeTaxInputSchema = z.object({
  taxYear: supportedTaxYearSchema.default(2025),
  filingStatus: filingStatusEnum.default("single"),
  w2WagesCents: z.number().int().min(0, "W-2 wages cannot be negative"),
  otherIncomeCents: z.number().int().min(0).default(0),
  federalWithholdingCents: z.number().int().min(0).default(0),
  itemizedDeductionCents: z.number().int().min(0).default(0),
});

// Self-Employed / 1099 Form Schema
export const selfEmployedInputSchema = z.object({
  taxYear: supportedTaxYearSchema.default(2025),
  filingStatus: filingStatusEnum.default("single"),
  gross1099IncomeCents: z.number().int().min(0, "1099 Income cannot be negative"),
  businessExpensesCents: z.number().int().min(0, "Business expenses cannot be negative"),
  w2WagesCents: z.number().int().min(0).default(0),
  federalWithholdingCents: z.number().int().min(0).default(0),
  hasOtherSelfEmploymentIncome: z.boolean().default(false),
});

// Quarterly Estimated Tax Form Schema
export const quarterlyTaxInputSchema = z.object({
  taxYear: supportedTaxYearSchema.default(2025),
  filingStatus: filingStatusEnum.default("single"),
  estimatedAnnualGrossCents: z.number().int().min(0, "Gross income cannot be negative"),
  estimatedAnnualExpensesCents: z.number().int().min(0, "Expenses cannot be negative"),
  w2AnnualWagesCents: z.number().int().min(0).default(0),
  w2AnnualWithholdingCents: z.number().int().min(0).default(0),
  priorYearTaxLiabilityCents: z.number().int().min(0).optional(),
});

export type ValidatedIncomeTaxInput = z.infer<typeof incomeTaxInputSchema>;
export type ValidatedSelfEmployedInput = z.infer<typeof selfEmployedInputSchema>;
export type ValidatedQuarterlyTaxInput = z.infer<typeof quarterlyTaxInputSchema>;
