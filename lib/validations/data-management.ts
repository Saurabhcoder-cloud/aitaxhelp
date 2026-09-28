import { z } from "zod";
import { DATASET_KEYS } from "@/types/data-management";

export const retentionPreviewSchema = z.object({
  dataset: z.enum(DATASET_KEYS as unknown as [string, ...string[]]).optional(),
});

export const retentionCleanupSchema = z.object({
  dataset: z.enum(DATASET_KEYS as unknown as [string, ...string[]]),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "Explicit confirmation (confirm: true) is strictly required for cleanup." }),
  }),
});

export const backupVerifySchema = z.object({
  dryRun: z.boolean().optional().default(true),
});

export const recoveryVerifySchema = z.object({
  simulateDrill: z.boolean().optional().default(true),
  dryRun: z.boolean().optional().default(true),
});

export const legalHoldCreateSchema = z.object({
  dataset: z.enum(DATASET_KEYS as unknown as [string, ...string[]]),
  recordId: z.string().min(1, "Record ID is required"),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});
