import { z } from "zod";
import { calculationIdParamSchema } from "@/lib/validations/calculation-history";

export const professionalLeadContactMethodEnum = z.enum(["email", "phone"]);
export const professionalLeadUrgencyEnum = z.enum([
  "immediate",
  "this_month",
  "planning_ahead",
  "within_week",
  "flexible",
]);
export const professionalReviewTypeEnum = z.enum(["cpa", "enrolled_agent", "tax_professional"]);
export type ProfessionalReviewType = z.infer<typeof professionalReviewTypeEnum>;

export const professionalLeadStatusEnum = z.enum([
  "new",
  "requested",
  "received",
  "assigned",
  "contacted",
  "in_progress",
  "review_in_progress",
  "closed",
  "completed",
  "cancelled",
]);

export const createProfessionalLeadSchema = z
  .object({
    calculationId: calculationIdParamSchema.optional(),
    sessionId: z.string().trim().min(1).max(64).optional(),
    reviewType: professionalReviewTypeEnum.default("cpa"),
    taxpayerName: z
      .string()
      .trim()
      .min(2, "Taxpayer name must be at least 2 characters")
      .max(100, "Taxpayer name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .email("A valid email address is required")
      .max(255, "Email address is too long"),
    phone: z
      .string()
      .trim()
      .max(30, "Phone number is too long")
      .optional()
      .or(z.literal("")),
    message: z
      .string()
      .trim()
      .max(2000, "Message cannot exceed 2000 characters")
      .optional()
      .or(z.literal("")),
    preferredContactMethod: professionalLeadContactMethodEnum.default("email"),
    urgency: professionalLeadUrgencyEnum.default("planning_ahead"),
    consentGiven: z.boolean().optional(),
  });

export type CreateProfessionalLeadInput = z.input<typeof createProfessionalLeadSchema>;
export type CreateProfessionalLeadOutput = z.infer<typeof createProfessionalLeadSchema>;
