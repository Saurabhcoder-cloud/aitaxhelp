import { z } from "zod";
import { ALLOWED_CONFIG_KEYS, PlatformConfigKey } from "@/types/platform-config";

export const platformConfigKeySchema = z.enum(ALLOWED_CONFIG_KEYS);

export const announcementTypeSchema = z.enum(["info", "warning", "maintenance"]);

export const updateConfigItemSchema = z.object({
  key: platformConfigKeySchema,
  value: z.union([
    z.boolean(),
    z
      .string()
      .trim()
      .max(500, "Configuration value string must not exceed 500 characters"),
    z.number(),
  ]),
  expectedVersion: z.number().int().min(1).optional(),
});

export const maintenanceConfigSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(500).optional(),
  bannerOnly: z.boolean().optional(),
});

export const announcementConfigSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(500),
  type: announcementTypeSchema.default("info"),
});

/**
 * Removes markup and event-handler attributes, then escapes remaining text.
 * Encoding alone leaves attributes such as onerror intact inside the string.
 */
export function sanitizeConfigString(unsafe: string): string {
  const withoutTags = unsafe.replace(/<[^>]*>/g, "");
  const withoutHandlers = withoutTags.replace(
    /\bon[a-z0-9_-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
    ""
  );
  return withoutHandlers
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validates that a key is strictly in the allowlist.
 */
export function isAllowedConfigKey(key: string): key is PlatformConfigKey {
  return (ALLOWED_CONFIG_KEYS as readonly string[]).includes(key);
}

/**
 * Checks if key or value appears to be a secret or credential.
 * INVARIANT: Secrets are NEVER permitted in configuration store.
 */
export function containsSecretCredential(keyOrValue: string, value?: unknown): boolean {
  if (value === undefined) {
    if (typeof keyOrValue === "string") {
      return (
        /^(sk_live|sk_test|ghp_|eyJh|whsec_)/i.test(keyOrValue) ||
        /(api_?key|password|credential|private_?key)/i.test(keyOrValue)
      );
    }
    return false;
  }

  const key = keyOrValue;
  const secretKeyRegex = /(api_?key|secret|token|password|credential|private_?key)/i;

  if (secretKeyRegex.test(key)) {
    return true;
  }

  if (typeof value === "string") {
    // Check if value looks like a bearer token or secret key prefix
    if (/^(sk_live|sk_test|ghp_|eyJh|whsec_)/i.test(value)) {
      return true;
    }
  }

  return false;
}
