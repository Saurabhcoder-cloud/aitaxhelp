import { z } from "zod";
import { PREPARATION_STEPS } from "@/lib/preparation/steps";

export const startPreparationSessionSchema = z
  .object({})
  .strict();

export const updatePreparationProgressSchema = z
  .object({
    completeStep: z
      .enum(PREPARATION_STEPS, {
        errorMap: () => ({ message: "Unknown preparation step." }),
      })
      .optional(),
    navigateToStep: z
      .enum(PREPARATION_STEPS, {
        errorMap: () => ({ message: "Unknown preparation step." }),
      })
      .optional(),
  })
  .strict()
  .refine((data) => data.completeStep !== undefined || data.navigateToStep !== undefined, {
    message: "Either completeStep or navigateToStep must be provided.",
  });

export type UpdatePreparationProgressInput = z.infer<typeof updatePreparationProgressSchema>;

export const importCalculatorSessionSchema = z
  .object({
    calculatorType: z.enum(["income_tax", "1099", "self_employed", "quarterly_tax"]),
    taxYear: z.number().int().refine((yr) => yr === 2025 || yr === 2026, {
      message: "Tax preparation currently supports tax years 2025 and 2026. Standalone calculations for earlier years cannot be imported.",
    }),
    filingStatus: z.enum([
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
      "qualifying_surviving_spouse",
    ]),
    w2WagesCents: z.number().int().nonnegative().optional().default(0),
    contractorGrossCents: z.number().int().nonnegative().optional().default(0),
    expensesCents: z.number().int().nonnegative().optional().default(0),
    withholdingCents: z.number().int().nonnegative().optional().default(0),
    overwriteExisting: z.boolean().optional().default(false),
  })
  .strict();

export type ImportCalculatorSessionInput = z.infer<typeof importCalculatorSessionSchema>;
