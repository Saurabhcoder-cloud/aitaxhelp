import { z } from "zod";

export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminLeadQuerySchema = adminPaginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["new", "contacted", "in_progress", "closed"]).optional(),
  taxYear: z.coerce.number().int().min(2020).max(2030).optional(),
});

export const adminUpdateLeadSchema = z
  .object({
    status: z.enum(["new", "contacted", "in_progress", "closed"]).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => data.status !== undefined || (data.note !== undefined && data.note.length > 0),
    {
      message: "At least one of status or note must be provided.",
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
