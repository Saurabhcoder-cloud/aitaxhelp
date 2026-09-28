import { z } from "zod";
import { PREPARATION_STEPS } from "@/lib/preparation/steps";

export const startPreparationSessionSchema = z
  .object({})
  .strict();

export const updatePreparationProgressSchema = z
  .object({
    completeStep: z.enum(PREPARATION_STEPS, {
      errorMap: () => ({ message: "Unknown preparation step." }),
    }),
  })
  .strict();

export type UpdatePreparationProgressInput = z.infer<typeof updatePreparationProgressSchema>;
