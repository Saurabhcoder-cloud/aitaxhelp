import { z } from "zod";
import {
  ACTIVITY_KINDS,
  FORM_1099_INCOME_TYPES,
  INCOME_SITUATIONS,
  IncomeDiscovery,
} from "@/lib/preparation/income";

const centsSchema = z
  .number()
  .int("Amounts must be whole cents.")
  .min(0, "Amounts cannot be negative.")
  .max(100_000_000_000, "Amount exceeds the allowed maximum.");

const requiredMoneySchema = centsSchema.min(1, "Enter an amount greater than zero.");

const nameSchema = z
  .string()
  .trim()
  .min(1, "A name is required.")
  .max(120, "Name cannot exceed 120 characters.");

const idSchema = z.string().uuid("Each income record needs a valid id.");

const w2Schema = z
  .object({
    id: idSchema,
    employerName: nameSchema,
    wagesCents: requiredMoneySchema,
    federalWithholdingCents: centsSchema,
  })
  .strict();

const form1099Schema = z
  .object({
    id: idSchema,
    incomeType: z.enum(FORM_1099_INCOME_TYPES),
    payerName: nameSchema,
    grossIncomeCents: requiredMoneySchema,
    federalWithholdingCents: centsSchema,
  })
  .strict();

const activitySchema = z
  .object({
    id: idSchema,
    kind: z.enum(ACTIVITY_KINDS),
    activityName: nameSchema,
    grossReceiptsCents: requiredMoneySchema,
    equipmentSuppliesCents: centsSchema,
    softwareSubscriptionsCents: centsSchema,
    homeOfficeVehicleCents: centsSchema,
    otherExpensesCents: centsSchema,
  })
  .strict();

function uniqueIds(ids: string[], ctx: z.RefinementCtx, path: string) {
  const seen = new Set<string>();
  ids.forEach((id, index) => {
    if (seen.has(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index, "id"],
        message: "Duplicate income record.",
      });
    }
    seen.add(id);
  });
}

function uniqueNames(names: string[], ctx: z.RefinementCtx, path: string, label: string) {
  const seen = new Set<string>();
  names.forEach((name, index) => {
    const key = name.trim().toLowerCase();
    if (!key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index],
        message: `${label} cannot be empty.`,
      });
      return;
    }
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path, index],
        message: `Duplicate ${label.toLowerCase()}.`,
      });
    }
    seen.add(key);
  });
}

export const incomeDiscoverySchema = z
  .object({
    situations: z
      .array(z.enum(INCOME_SITUATIONS))
      .min(1, "Choose at least one way you made money.")
      .max(4),
    w2s: z.array(w2Schema).max(20),
    form1099s: z.array(form1099Schema).max(20),
    activities: z.array(activitySchema).max(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    const situations = new Set(value.situations);
    if (situations.size !== value.situations.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["situations"],
        message: "Each income situation can be selected only once.",
      });
    }

    uniqueIds(value.w2s.map((entry) => entry.id), ctx, "w2s");
    uniqueIds(value.form1099s.map((entry) => entry.id), ctx, "form1099s");
    uniqueIds(value.activities.map((entry) => entry.id), ctx, "activities");
    uniqueNames(
      value.w2s.map((entry) => entry.employerName),
      ctx,
      "w2s",
      "Employer name"
    );
    uniqueNames(
      value.form1099s.map((entry) => entry.payerName),
      ctx,
      "form1099s",
      "Payer name"
    );
    uniqueNames(
      value.activities.map((entry) => entry.activityName),
      ctx,
      "activities",
      "Activity name"
    );

    if (situations.has("employer") && value.w2s.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["w2s"],
        message: "Add at least one W-2 job.",
      });
    }
    if (!situations.has("employer") && value.w2s.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["w2s"],
        message: "W-2 jobs require employer income to be selected.",
      });
    }
    if (situations.has("freelance") && value.form1099s.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["form1099s"],
        message: "Add at least one freelance or contract income source.",
      });
    }
    if (!situations.has("freelance") && value.form1099s.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["form1099s"],
        message: "Freelance income requires that situation to be selected.",
      });
    }

    const gigActivities = value.activities.filter((entry) => entry.kind === "gig");
    const businessActivities = value.activities.filter((entry) => entry.kind === "business");
    if (situations.has("gig") && gigActivities.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activities"],
        message: "Add at least one gig activity.",
      });
    }
    if (situations.has("business") && businessActivities.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activities"],
        message: "Add at least one business activity.",
      });
    }
    if (!situations.has("gig") && gigActivities.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activities"],
        message: "Gig activities require gig income to be selected.",
      });
    }
    if (!situations.has("business") && businessActivities.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activities"],
        message: "Business activities require business income to be selected.",
      });
    }
  });

export type IncomeDiscoveryInput = z.infer<typeof incomeDiscoverySchema>;

export function isCompleteIncomeDiscovery(value: IncomeDiscovery): boolean {
  return incomeDiscoverySchema.safeParse(value).success;
}
