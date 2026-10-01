import { z } from "zod";
import { getAppEnvironment, AppEnvironment } from "./environment";

/**
 * Validated Environment Variable Contracts (Phase 5 Step 18)
 *
 * Defines explicit server and client environment contracts.
 * Enforces Zod schema validation and safe secret redaction.
 */

// Known sensitive variable keys that must NEVER be exposed publicly
export const SECRET_ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "EMAIL_API_KEY",
  "CRON_SECRET",
] as const;

/**
 * Server-only environment variables.
 * MUST NEVER have NEXT_PUBLIC_ prefix.
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production"]).optional(),
  GEMINI_API_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PREMIUM_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_PREMIUM_ANNUAL: z.string().optional(),
  STRIPE_PRICE_ID_PROFESSIONAL: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["null", "console", "resend", "smtp"]).default("null"),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  ADMIN_USER_IDS: z.string().optional(),
  BACKUP_PROVIDER: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Client-accessible public environment variables.
 * MUST begin with NEXT_PUBLIC_ prefix.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Redacts a secret token, displaying only a safe mask.
 * Example: "sk_live_abc123xyz" -> "••••••••" (or short mask)
 */
export function redactSecret(secret?: string | null): string {
  if (!secret) return "NOT_SET";
  if (secret.length <= 4) return "••••";
  // Provide safe mask indicating length without revealing characters
  return `•••••••• (length: ${secret.length})`;
}

/**
 * Masks a token or identifier safely (preserving prefix if any, masking remainder).
 */
export function maskToken(token?: string | null): string {
  if (!token) return "NOT_SET";
  if (token.length <= 8) return "••••••••";
  const start = token.slice(0, 3);
  const end = token.slice(-3);
  return `${start}••••${end}`;
}

/**
 * Sanitizes an environment map by stripping or redacting any sensitive credentials.
 */
export function sanitizeEnvironmentReport(
  rawEnv: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, val] of Object.entries(rawEnv)) {
    const isSecret =
      SECRET_ENV_KEYS.some((s) => key.toUpperCase().includes(s)) ||
      key.toUpperCase().includes("SECRET") ||
      key.toUpperCase().includes("KEY") ||
      key.toUpperCase().includes("PASSWORD") ||
      key.toUpperCase().includes("TOKEN");

    if (isSecret) {
      result[key] = val ? "[CONFIGURED: REDACTED]" : "[NOT CONFIGURED]";
    } else {
      result[key] = typeof val === "string" ? val : String(val);
    }
  }

  return result;
}

/**
 * Returns canonical production base URL.
 * Falls back to NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL, or https://taxaihelp.com.
 */
export function getCanonicalAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://taxaihelp.com";

  return url.replace(/\/+$/, ""); // remove trailing slash
}

/**
 * Validates server-side environment against current requirements.
 */
export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env.APP_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || "null",
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
    BACKUP_PROVIDER: process.env.BACKUP_PROVIDER,
    CRON_SECRET: process.env.CRON_SECRET,
  });
}
