import { z } from "zod";

export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminLeadQuerySchema = adminPaginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z
    .enum([
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
    ])
    .optional(),
  taxYear: z.coerce.number().int().min(2020).max(2030).optional(),
});

export const adminUpdateLeadSchema = z
  .object({
    status: z
      .enum([
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
      ])
      .optional(),
    note: z.string().trim().max(2000).optional(),
    assignedProfessionalId: z.string().trim().max(64).optional(),
    assignedProfessionalName: z.string().trim().max(100).optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      (data.note !== undefined && data.note.length > 0) ||
      data.assignedProfessionalId !== undefined ||
      data.assignedProfessionalName !== undefined,
    {
      message: "At least one update field (status, note, or assignment) must be provided.",
    }
  );

export const adminUserQuerySchema = adminPaginationSchema.extend({
  q: z.string().trim().max(100).optional(),
});

export const adminCalculationQuerySchema = adminPaginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  taxYear: z.coerce.number().int().min(2020).max(2030).optional(),
  calculatorType: z.enum(["income_tax", "self_employed", "1099", "quarterly_tax"]).optional(),
});
