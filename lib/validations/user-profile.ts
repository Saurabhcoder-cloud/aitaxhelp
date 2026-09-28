import { z } from "zod";

export const updateUserProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(100, "Full name cannot exceed 100 characters.")
    .nullable()
    .optional(),
});

export const updateTaxProfileSchema = z.object({
  defaultTaxYear: z
    .union([z.literal(2023), z.literal(2024), z.literal(2025), z.literal(2026)], {
      errorMap: () => ({ message: "Tax year must be 2023, 2024, 2025, or 2026." }),
    })
    .optional(),
  filingStatus: z
    .enum(
      [
        "single",
        "married_filing_jointly",
        "married_filing_separately",
        "head_of_household",
        "qualifying_surviving_spouse",
      ],
      {
        errorMap: () => ({ message: "Invalid IRS filing status." }),
      }
    )
    .optional(),
  hasW2Income: z.boolean().optional(),
  has1099Income: z.boolean().optional(),
  hasBusinessExpenses: z.boolean().optional(),
  stateOfResidence: z
    .string()
    .trim()
    .max(50, "State of residence cannot exceed 50 characters.")
    .optional(),
});

export const updateProfileRequestSchema = z.object({
  profile: updateUserProfileSchema.optional(),
  taxProfile: updateTaxProfileSchema.optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UpdateTaxProfileInput = z.infer<typeof updateTaxProfileSchema>;
export type UpdateProfileRequestInput = z.infer<typeof updateProfileRequestSchema>;
