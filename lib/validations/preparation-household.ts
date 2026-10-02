import { z } from "zod";
import { DEPENDENT_RELATIONSHIPS } from "@/lib/preparation/household";
import { TaxFilingStatus } from "@/types/tax";

const filingStatusEnum = z.enum([
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_surviving_spouse",
]);

export const dependentSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  firstName: z.string().trim().min(1, "Dependent first name is required").max(50),
  lastName: z.string().trim().min(1, "Dependent last name is required").max(50),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be formatted as YYYY-MM-DD")
    .refine((dob) => {
      const parsed = new Date(dob);
      if (isNaN(parsed.getTime())) return false;
      const today = new Date();
      if (parsed > today) return false;
      const year = parsed.getUTCFullYear();
      return year >= 1900 && year <= today.getFullYear();
    }, "Date of birth must be a valid past date after 1900"),
  relationship: z.enum(DEPENDENT_RELATIONSHIPS),
  monthsLivedWithTaxpayer: z
    .number()
    .int()
    .min(0, "Months lived in home must be between 0 and 12")
    .max(12, "Months lived in home must be between 0 and 12"),
  isFullTimeStudent: z.boolean().optional(),
  isPermanentlyDisabled: z.boolean().optional(),
  providedMoreThanHalfOwnSupport: z.boolean().optional(),
  providedMoreThanHalfSupport: z.boolean().optional(),
  claimedByOtherTaxpayer: z.boolean().optional(),
  isQualifyingChild: z.boolean().optional(),
  ssnLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "SSN/ITIN last 4 digits must be exactly 4 digits")
    .optional()
    .or(z.literal("")),
});

export type DependentSchema = z.infer<typeof dependentSchema>;

export const spouseSchema = z.object({
  firstName: z.string().trim().min(1, "Spouse first name is required").max(50),
  lastName: z.string().trim().min(1, "Spouse last name is required").max(50),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Spouse date of birth must be formatted as YYYY-MM-DD")
    .refine((dob) => {
      const parsed = new Date(dob);
      if (isNaN(parsed.getTime())) return false;
      const today = new Date();
      if (parsed > today) return false;
      const year = parsed.getUTCFullYear();
      return year >= 1900 && year <= today.getFullYear();
    }, "Spouse date of birth must be a valid past date")
    .optional()
    .or(z.literal("")),
  ssnLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Spouse SSN/ITIN last 4 digits must be exactly 4 digits")
    .optional()
    .or(z.literal("")),
  hasIncome: z.boolean().optional().default(false),
  hasW2Income: z.boolean().optional().default(false),
  w2WagesCents: z.number().int().min(0).optional().default(0),
  spouseW2WagesCents: z.number().int().min(0).optional().default(0),
  federalWithholdingCents: z.number().int().min(0).optional().default(0),
  hasSelfEmploymentIncome: z.boolean().optional().default(false),
  gross1099IncomeCents: z.number().int().min(0).optional().default(0),
  spouse1099GrossCents: z.number().int().min(0).optional().default(0),
  spouseGross1099IncomeCents: z.number().int().min(0).optional().default(0),
  businessExpensesCents: z.number().int().min(0).optional().default(0),
  spouseBusinessExpensesCents: z.number().int().min(0).optional().default(0),
});

export type SpouseSchema = z.infer<typeof spouseSchema>;

export const householdInputSchema = z
  .object({
    filingStatus: filingStatusEnum,
    spouse: spouseSchema.optional(),
    dependents: z.array(dependentSchema).default([]),
  })
  .superRefine((data, ctx) => {
    // 1. Married filing statuses require spouse details
    if (data.filingStatus === "married_filing_jointly" || data.filingStatus === "married_filing_separately") {
      if (!data.spouse || !data.spouse.firstName || !data.spouse.lastName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Spouse details (first and last name) are required for married filing status.",
          path: ["spouse"],
        });
      }
    }

    // 2. Head of Household requires at least 1 dependent
    if (data.filingStatus === "head_of_household") {
      if (!data.dependents || data.dependents.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Head of Household filing status requires at least one qualifying dependent.",
          path: ["dependents"],
        });
      }
    }

    // 3. Qualifying Surviving Spouse requires at least 1 dependent child
    if (data.filingStatus === "qualifying_surviving_spouse") {
      const hasChild = data.dependents?.some((d) =>
        ["child", "son", "daughter", "stepchild", "foster_child"].includes(d.relationship)
      );
      if (!hasChild) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Qualifying Surviving Spouse status requires at least one dependent child or stepchild.",
          path: ["dependents"],
        });
      }
    }

    // 4. Duplicate dependent detection
    if (data.dependents && data.dependents.length > 1) {
      const seen = new Set<string>();
      for (let i = 0; i < data.dependents.length; i++) {
        const d = data.dependents[i];
        const key = `${d.firstName.toLowerCase()}|${d.lastName.toLowerCase()}|${d.dateOfBirth}`;
        if (seen.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate dependent detected: ${d.firstName} ${d.lastName} (${d.dateOfBirth}).`,
            path: ["dependents", i],
          });
        }
        seen.add(key);
      }
    }
  });

export type HouseholdInput = z.infer<typeof householdInputSchema>;
