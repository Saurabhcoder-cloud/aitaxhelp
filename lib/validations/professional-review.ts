import { z } from "zod";

export const reviewTypeEnum = z.enum(["cpa", "enrolled_agent", "tax_professional"]);

export const reviewPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const reviewCaseStatusEnum = z.enum([
  "REQUESTED",
  "UNASSIGNED",
  "ASSIGNED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "READY_FOR_FINAL_REVIEW",
  "REVIEW_COMPLETED",
  "CLOSED",
  "CANCELLED",
]);

export const reviewCommentSectionEnum = z.enum([
  "taxpayer_profile",
  "filing_status",
  "spouse",
  "dependents",
  "w2_income",
  "1099_income",
  "business_income",
  "adjustments",
  "deductions",
  "credits",
  "federal_return",
  "state_return",
  "documents",
  "efile_readiness",
]);

export const reviewCommentSeverityEnum = z.enum(["INFO", "WARNING", "REQUIRES_ACTION"]);

export const reviewCommentStatusEnum = z.enum(["OPEN", "RESOLVED"]);

export const requestReviewSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required."),
  reviewType: reviewTypeEnum.optional().default("cpa"),
  priority: reviewPriorityEnum.optional().default("NORMAL"),
  taxpayerNotes: z.string().max(1000, "Notes cannot exceed 1000 characters.").optional(),
});

export const addCommentSchema = z.object({
  section: reviewCommentSectionEnum,
  message: z.string().min(2, "Message must be at least 2 characters.").max(2000, "Message cannot exceed 2000 characters."),
  severity: reviewCommentSeverityEnum.default("INFO"),
});

export const assignProfessionalSchema = z.object({
  professionalId: z.string().min(1, "Professional ID is required."),
  professionalName: z.string().min(2, "Professional name is required."),
});

export const requestChangesSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const resubmitReviewSchema = z.object({
  taxpayerNotes: z.string().max(1000).optional(),
});

export const completeReviewSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const updateCaseStatusSchema = z.object({
  targetStatus: reviewCaseStatusEnum,
  notes: z.string().max(1000).optional(),
});

export const queryReviewCasesSchema = z.object({
  status: reviewCaseStatusEnum.optional(),
  taxYear: z.coerce.number().int().min(2020).max(2030).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
