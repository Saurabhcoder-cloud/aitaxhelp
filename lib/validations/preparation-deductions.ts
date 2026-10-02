import { z } from "zod";
import {
  DEDUCTION_CATEGORIES,
  DeductionDiscovery,
  incomeSupportsBusinessExpenses,
  isBusinessDeductionCategory,
} from "@/lib/preparation/deductions";
import { IncomeDiscovery } from "@/lib/preparation/income";

export const centsSchema = z
  .number()
  .int("Amounts must be whole cents.")
  .min(0, "Amounts cannot be negative.")
  .max(100_000_000_000, "Amount exceeds the allowed maximum.");

export const entrySchema = z
  .object({
    id: z.string().trim().min(1, "Deduction ID is required."),
    category: z.enum(DEDUCTION_CATEGORIES),
    amountCents: centsSchema,
    description: z.string().trim().max(200).optional().default(""),
    relatedIncomeId: z.string().trim().min(1).nullable().optional().default(null),
    confirmed: z.boolean().default(true),
    businessUsePercent: z
      .number()
      .int("Percentage must be a whole number.")
      .min(1, "Business use must be at least 1%.")
      .max(100, "Business use cannot exceed 100%.")
      .optional(),
    subtype: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(500).optional(),
    taxYear: z.number().int().optional(),
    status: z
      .enum(["applied_business", "standard_deduction_used", "applied_itemized", "applied_above_the_line", "unsupported_schedule_a", "future_extension"])
      .optional(),
  })
  .strict();

export const guidedAnswersSchema = z
  .object({
    home: z
      .object({
        ownedHome: z.boolean().nullable().optional(),
        mortgageInterestCents: centsSchema.optional(),
        propertyTaxesCents: centsSchema.optional(),
      })
      .optional(),
    charity: z
      .object({
        madeDonations: z.boolean().nullable().optional(),
        cashCents: centsSchema.optional(),
        nonCashCents: centsSchema.optional(),
      })
      .optional(),
    medical: z
      .object({
        hadSignificantMedical: z.boolean().nullable().optional(),
        medicalExpensesCents: centsSchema.optional(),
      })
      .optional(),
    stateLocal: z
      .object({
        paidStateLocalTaxes: z.boolean().nullable().optional(),
        stateLocalTaxCents: centsSchema.optional(),
      })
      .optional(),
    education: z
      .object({
        paidEducation: z.boolean().nullable().optional(),
        studentLoanInterestCents: centsSchema.optional(),
        tuitionCents: centsSchema.optional(),
      })
      .optional(),
    childcare: z
      .object({
        paidChildcare: z.boolean().nullable().optional(),
        childcareCents: centsSchema.optional(),
      })
      .optional(),
    retirementHsa: z
      .object({
        contributedRetirementHsa: z.boolean().nullable().optional(),
        traditionalIraCents: centsSchema.optional(),
        hsaCents: centsSchema.optional(),
      })
      .optional(),
    business: z
      .object({
        hadBusinessExpenses: z.boolean().nullable().optional(),
        milesDriven: z.number().int().min(0).max(1_000_000).optional(),
        homeOfficeSqFt: z.number().int().min(0).max(100_000).optional(),
      })
      .optional(),
  })
  .optional();

export const deductionDiscoveryInputSchema = z
  .object({
    hasBusinessExpenses: z.boolean().nullable(),
    standardDeductionAcknowledged: z.boolean(),
    entries: z.array(entrySchema).max(100),
    guidedAnswers: guidedAnswersSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.entries.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "id"],
          message: "Duplicate deduction.",
        });
      }
      seen.add(entry.id);
      if (entry.confirmed && entry.amountCents < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "amountCents"],
          message: "Enter an amount greater than zero, or remove this expense.",
        });
      }
      if (
        entry.businessUsePercent !== undefined &&
        (entry.businessUsePercent < 1 || entry.businessUsePercent > 100)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "businessUsePercent"],
          message: "Business use percentage must be between 1% and 100%.",
        });
      }
    });
  });

export function isCompleteDeductionDiscovery(
  discovery: DeductionDiscovery,
  income: IncomeDiscovery
): { success: true } | { success: false; message: string } {
  const parsed = deductionDiscoveryInputSchema.safeParse({
    hasBusinessExpenses: discovery.hasBusinessExpenses,
    standardDeductionAcknowledged: discovery.standardDeductionAcknowledged,
    entries: discovery.entries,
    guidedAnswers: discovery.guidedAnswers,
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Deduction details are incomplete." };
  }
  if (!discovery.saved) {
    return { success: false, message: "Save deduction answers before continuing." };
  }

  const businessIncome = incomeSupportsBusinessExpenses(income);
  const businessEntries = discovery.entries.filter((entry) => isBusinessDeductionCategory(entry.category));

  if (businessIncome) {
    if (discovery.hasBusinessExpenses === null) {
      return { success: false, message: "Tell us whether you had costs for this work." };
    }
    if (discovery.hasBusinessExpenses && businessEntries.filter((entry) => entry.confirmed).length === 0) {
      return { success: false, message: "Add at least one expense, or say you had no costs." };
    }
    if (!discovery.hasBusinessExpenses && businessEntries.length > 0) {
      return { success: false, message: "Remove expense entries if you had no costs." };
    }
  } else if (!discovery.standardDeductionAcknowledged) {
    return {
      success: false,
      message: "Confirm that the tax engine will use the standard deduction.",
    };
  } else if (businessEntries.length > 0) {
    return {
      success: false,
      message: "Business expenses apply only when you have freelance, gig, or business income.",
    };
  }

  const incomeIds = new Set([
    ...income.w2s.map((entry) => entry.id),
    ...income.form1099s.map((entry) => entry.id),
    ...income.activities.map((entry) => entry.id),
  ]);
  for (const entry of discovery.entries) {
    if (entry.relatedIncomeId && !incomeIds.has(entry.relatedIncomeId)) {
      return { success: false, message: "An expense points at an income source that is not in this session." };
    }
  }

  return { success: true };
}
