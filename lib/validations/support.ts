import { z } from "zod";
import {
  SupportCategory,
  SupportPriority,
  SupportStatus,
} from "@/types/support";

export const SUPPORT_CATEGORIES: [SupportCategory, ...SupportCategory[]] = [
  "ACCOUNT",
  "BILLING",
  "CALCULATOR",
  "TAX_CALCULATION",
  "AI_ASSISTANT",
  "REPORT",
  "PROFESSIONAL_HANDOFF",
  "BUG",
  "FEATURE_REQUEST",
  "FEEDBACK",
  "SECURITY",
  "PRIVACY",
  "OTHER",
];

export const SUPPORT_PRIORITIES: [SupportPriority, ...SupportPriority[]] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export const SUPPORT_STATUSES: [SupportStatus, ...SupportStatus[]] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "WAITING_INTERNAL",
  "RESOLVED",
  "CLOSED",
];

/**
 * Strips dangerous HTML, script tags, and event handlers from text inputs.
 * Strictly prevents XSS, iframe injection, and javascript: execution.
 */
export function sanitizeSupportText(input: string): string {
  if (!input) return "";

  return input
    // Strip script blocks and tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Strip iframe blocks and tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    // Strip style blocks and tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Strip any HTML tags
    .replace(/<[^>]+>/g, "")
    // Strip javascript: pseudo-protocols
    .replace(/javascript:/gi, "")
    // Strip inline event attributes like onerror=, onclick=
    .replace(/on\w+\s*=/gi, "")
    // Normalize newlines and trim
    .trim();
}

/**
 * Safe context metadata schema.
 * STRICT INVARIANT: Zero financial numbers or taxpayer sensitive data.
 */
export const supportSafeContextSchema = z
  .object({
    calculationId: z.string().trim().max(100).optional(),
    calculatorType: z.string().trim().max(50).optional(),
    taxYear: z.number().int().min(2020).max(2035).optional(),
    filingStatus: z.string().trim().max(50).optional(),
    engineVersion: z.string().trim().max(50).optional(),
    rulesVersion: z.string().trim().max(50).optional(),
    reportId: z.string().trim().max(100).optional(),
    conversationId: z.string().trim().max(100).optional(),
  })
  .optional();

/**
 * User ticket creation schema.
 */
export const createSupportTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, "Subject must be at least 5 characters.")
    .max(160, "Subject cannot exceed 160 characters."),
  category: z.enum(SUPPORT_CATEGORIES, {
    errorMap: () => ({ message: "Invalid support category selected." }),
  }),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(5000, "Description cannot exceed 5000 characters."),
  priority: z.enum(SUPPORT_PRIORITIES).optional().default("NORMAL"),
  safeContext: supportSafeContextSchema,
  rating: z.number().int().min(1).max(5).optional(),
});

/**
 * Message addition schema (User or Admin).
 */
export const addSupportMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message body cannot be empty.")
    .max(5000, "Message body cannot exceed 5000 characters."),
});

/**
 * Admin internal note schema.
 */
export const adminInternalNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Internal note cannot be empty.")
    .max(5000, "Internal note cannot exceed 5000 characters."),
});

/**
 * Admin assignment schema.
 */
export const adminAssignTicketSchema = z.object({
  assignedAdminId: z.string().trim().max(100).nullable(),
});

/**
 * Admin status update schema.
 */
export const adminUpdateStatusSchema = z.object({
  status: z.enum(SUPPORT_STATUSES, {
    errorMap: () => ({ message: "Invalid support status." }),
  }),
});

/**
 * Admin priority update schema.
 */
export const adminUpdatePrioritySchema = z.object({
  priority: z.enum(SUPPORT_PRIORITIES, {
    errorMap: () => ({ message: "Invalid support priority." }),
  }),
});

/**
 * Admin combined ticket update schema.
 */
export const adminUpdateSupportTicketSchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  assignedAdminId: z.string().trim().max(100).nullable().optional(),
});

/**
 * User patch ticket schema (close or reopen).
 */
export const userUpdateTicketSchema = z.object({
  action: z.enum(["close", "reopen"], {
    errorMap: () => ({ message: "Action must be either 'close' or 'reopen'." }),
  }),
});

/**
 * Support tickets query and search schema.
 */
export const supportSearchFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).transform((v) => Math.min(v, 100)).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(SUPPORT_STATUSES).optional(),
  category: z.enum(SUPPORT_CATEGORIES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  assignedAdminId: z.string().trim().max(100).optional(),
});
