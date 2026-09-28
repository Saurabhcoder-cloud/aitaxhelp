import { z } from "zod";

export const notificationCategoryEnum = z.enum([
  "authentication",
  "calculations",
  "ai",
  "billing",
  "professional",
  "system",
]);

export const notificationQuerySchema = z.object({
  unreadOnly: z
    .union([z.boolean(), z.string().transform((val) => val === "true")])
    .optional(),
  category: notificationCategoryEnum.optional(),
  limit: z.coerce.number().int().min(1).transform((v) => Math.min(v, 50)).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateNotificationPreferencesSchema = z.object({
  taxReportsEnabled: z.boolean().optional(),
  calculationsEnabled: z.boolean().optional(),
  aiUsageEnabled: z.boolean().optional(),
  billingEnabled: z.boolean().optional(),
  professionalHandoffEnabled: z.boolean().optional(),
  productUpdatesEnabled: z.boolean().optional(),
  marketingEnabled: z.boolean().optional(),
});

export const markNotificationSchema = z.object({
  read: z.boolean().default(true),
});
