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
