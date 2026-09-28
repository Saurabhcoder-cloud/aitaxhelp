import { z } from "zod";
import {
  DEDUCTION_CATEGORIES,
  DeductionDiscovery,
  incomeSupportsBusinessExpenses,
} from "@/lib/preparation/deductions";
import { IncomeDiscovery } from "@/lib/preparation/income";

const centsSchema = z
  .number()
  .int("Amounts must be whole cents.")
  .min(0, "Amounts cannot be negative.")
  .max(100_000_000_000, "Amount exceeds the allowed maximum.");

const entrySchema = z
  .object({
    id: z.string().uuid(),
    category: z.enum(DEDUCTION_CATEGORIES),
    amountCents: centsSchema,
    description: z.string().trim().max(200).default(""),
    relatedIncomeId: z.string().uuid().nullable(),
    confirmed: z.boolean(),
  })
  .strict();

export const deductionDiscoveryInputSchema = z
  .object({
    hasBusinessExpenses: z.boolean().nullable(),
    standardDeductionAcknowledged: z.boolean(),
    entries: z.array(entrySchema).max(40),
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
  });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Deduction details are incomplete." };
  }
  if (!discovery.saved) {
    return { success: false, message: "Save deduction answers before continuing." };
  }

  const businessIncome = incomeSupportsBusinessExpenses(income);
  if (businessIncome) {
    if (discovery.hasBusinessExpenses === null) {
      return { success: false, message: "Tell us whether you had costs for this work." };
    }
    if (discovery.hasBusinessExpenses && discovery.entries.filter((entry) => entry.confirmed).length === 0) {
      return { success: false, message: "Add at least one expense, or say you had no costs." };
    }
    if (!discovery.hasBusinessExpenses && discovery.entries.length > 0) {
      return { success: false, message: "Remove expense entries if you had no costs." };
    }
  } else if (!discovery.standardDeductionAcknowledged) {
    return {
      success: false,
      message: "Confirm that the tax engine will use the standard deduction.",
    };
  } else if (discovery.entries.length > 0) {
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
