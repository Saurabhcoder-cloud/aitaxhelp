/**
 * Notification & Email Configuration (Phase 5 Step 13)
 * Server-only configuration reader.
 * INVARIANT: Never prefix sensitive email API keys with NEXT_PUBLIC_.
 */

export interface EmailConfig {
  provider: "null" | "console" | "resend" | "smtp";
  from: string;
  replyTo: string;
  apiKey?: string;
  adminNotificationEmail?: string;
  siteUrl: string;
}

export function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || "null").toLowerCase() as
    | "null"
    | "console"
    | "resend"
    | "smtp";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://taxaihelp.com";

  return {
    provider: ["null", "console", "resend", "smtp"].includes(provider)
      ? provider
      : "null",
    from: process.env.EMAIL_FROM || "TaxAIHelp <notifications@taxaihelp.com>",
    replyTo: process.env.EMAIL_REPLY_TO || "support@taxaihelp.com",
    apiKey: process.env.EMAIL_API_KEY || undefined,
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || undefined,
    siteUrl,
  };
}
