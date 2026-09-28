import { getAppEnvironment, AppEnvironment } from "./environment";
import { PlatformConfigStore } from "./platform-config-store";
import { getCanonicalAppUrl } from "./env";

export type EnvVarCategory = "PUBLIC" | "SERVER_ONLY" | "SECRET";
export type EnvRequirementLevel = "REQUIRED" | "OPTIONAL" | "FEATURE_DEPENDENT";
export type EnvVarStatus = "OK" | "MISSING" | "INVALID" | "OPTIONAL_UNCONFIGURED";

export interface EnvCheckItem {
  variable: string;
  category: EnvVarCategory;
  requirement: EnvRequirementLevel;
  configured: boolean;
  status: EnvVarStatus;
  message: string;
}

export interface EnvironmentCheckReport {
  environment: AppEnvironment;
  isValid: boolean;
  hasBlockingErrors: boolean;
  hasWarnings: boolean;
  items: EnvCheckItem[];
  checkedAt: string;
}

/**
 * Validates environment completeness and production readiness.
 * PRIVACY GUARANTEE: Never outputs or logs secret values.
 */
export class EnvironmentCheckService {
  /**
   * Evaluates all known environment variables against project operational requirements.
   */
  public static checkEnvironment(targetEnv?: AppEnvironment): EnvironmentCheckReport {
    const env = targetEnv || getAppEnvironment();
    const isProd = env === "production";
    const isStage = env === "staging";

    const items: EnvCheckItem[] = [];

    // 1. APP_URL / SITE_URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
    const isAppUrlConfigured = Boolean(appUrl);
    const isAppUrlHttps = appUrl.startsWith("https://");
    const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

    let appUrlStatus: EnvVarStatus = "OK";
    let appUrlMessage = "Application URL configured.";

    if (!isAppUrlConfigured) {
      appUrlStatus = isProd ? "MISSING" : "OPTIONAL_UNCONFIGURED";
      appUrlMessage = isProd
        ? "NEXT_PUBLIC_APP_URL is required in production."
        : "Using default application URL fallback.";
    } else if (isProd && !isAppUrlHttps) {
      appUrlStatus = "INVALID";
      appUrlMessage = "NEXT_PUBLIC_APP_URL must use HTTPS in production.";
    } else if (isProd && isLocalhost) {
      appUrlStatus = "INVALID";
      appUrlMessage = "NEXT_PUBLIC_APP_URL cannot be localhost in production.";
    }

    items.push({
      variable: "NEXT_PUBLIC_APP_URL",
      category: "PUBLIC",
      requirement: isProd ? "REQUIRED" : "OPTIONAL",
      configured: isAppUrlConfigured,
      status: appUrlStatus,
      message: appUrlMessage,
    });

    // 2. SUPABASE URL & PUBLISHABLE KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const isSupabaseUrlConfigured = Boolean(supabaseUrl);
    const isSupabaseHttps = supabaseUrl.startsWith("https://");

    let supabaseUrlStatus: EnvVarStatus = "OK";
    let supabaseUrlMessage = "Supabase URL configured.";

    if (!isSupabaseUrlConfigured) {
      supabaseUrlStatus = isProd ? "MISSING" : "OPTIONAL_UNCONFIGURED";
      supabaseUrlMessage = isProd
        ? "NEXT_PUBLIC_SUPABASE_URL is required for live production persistence."
        : "Supabase unconfigured; operating in local in-memory store mode.";
    } else if (isProd && !isSupabaseHttps) {
      supabaseUrlStatus = "INVALID";
      supabaseUrlMessage = "NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production.";
    }

    items.push({
      variable: "NEXT_PUBLIC_SUPABASE_URL",
      category: "PUBLIC",
      requirement: isProd ? "REQUIRED" : "OPTIONAL",
      configured: isSupabaseUrlConfigured,
      status: supabaseUrlStatus,
      message: supabaseUrlMessage,
    });

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";
    items.push({
      variable: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      category: "PUBLIC",
      requirement: isProd ? "REQUIRED" : "OPTIONAL",
      configured: Boolean(supabaseKey),
      status: !supabaseKey
        ? isProd
          ? "MISSING"
          : "OPTIONAL_UNCONFIGURED"
        : "OK",
      message: supabaseKey
        ? "Supabase publishable key configured."
        : isProd
        ? "Publishable key required in production."
        : "Unconfigured in development mode.",
    });

    // 3. GEMINI_API_KEY (Feature Dependent on ai.assistant_enabled)
    const isAiEnabled = PlatformConfigStore.getBoolean("ai.assistant_enabled", true);
    const geminiKey = process.env.GEMINI_API_KEY || "";
    const isGeminiConfigured = Boolean(geminiKey && geminiKey.length > 5);

    let geminiStatus: EnvVarStatus = "OK";
    let geminiMessage = "Gemini AI API key configured.";

    if (isAiEnabled && !isGeminiConfigured) {
      geminiStatus = isProd ? "MISSING" : "OPTIONAL_UNCONFIGURED";
      geminiMessage = isProd
        ? "GEMINI_API_KEY is required when AI assistant feature is enabled in production."
        : "GEMINI_API_KEY unconfigured; operating in mock explanation mode.";
    } else if (!isAiEnabled && !isGeminiConfigured) {
      geminiStatus = "OPTIONAL_UNCONFIGURED";
      geminiMessage = "AI assistant is disabled via feature flag; key not required.";
    }

    items.push({
      variable: "GEMINI_API_KEY",
      category: "SECRET",
      requirement: isAiEnabled && isProd ? "REQUIRED" : "FEATURE_DEPENDENT",
      configured: isGeminiConfigured,
      status: geminiStatus,
      message: geminiMessage,
    });

    // 4. STRIPE KEYS (Feature Dependent on billing.enabled)
    const isBillingEnabled = PlatformConfigStore.getBoolean("billing.enabled", true);
    const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
    const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET || "";
    const isStripeConfigured = Boolean(stripeSecret && stripeSecret.startsWith("sk_"));

    let stripeStatus: EnvVarStatus = "OK";
    let stripeMessage = "Stripe secret key configured.";

    if (isBillingEnabled && !isStripeConfigured) {
      stripeStatus = isProd ? "MISSING" : "OPTIONAL_UNCONFIGURED";
      stripeMessage = isProd
        ? "STRIPE_SECRET_KEY required when billing is enabled in production."
        : "Stripe key unconfigured; billing operates in staging/mock mode.";
    } else if (!isBillingEnabled && !isStripeConfigured) {
      stripeStatus = "OPTIONAL_UNCONFIGURED";
      stripeMessage = "Billing disabled via feature flag; Stripe key not required.";
    }

    items.push({
      variable: "STRIPE_SECRET_KEY",
      category: "SECRET",
      requirement: isBillingEnabled && isProd ? "REQUIRED" : "FEATURE_DEPENDENT",
      configured: isStripeConfigured,
      status: stripeStatus,
      message: stripeMessage,
    });

    items.push({
      variable: "STRIPE_WEBHOOK_SECRET",
      category: "SECRET",
      requirement: isBillingEnabled && isProd ? "REQUIRED" : "FEATURE_DEPENDENT",
      configured: Boolean(stripeWebhook),
      status: isBillingEnabled && isProd && !stripeWebhook ? "MISSING" : isBillingEnabled ? "OK" : "OPTIONAL_UNCONFIGURED",
      message: stripeWebhook
        ? "Stripe webhook signature secret configured."
        : isBillingEnabled && isProd
        ? "STRIPE_WEBHOOK_SECRET required for webhook verification in production."
        : "Stripe webhook secret unconfigured.",
    });

    // 5. EMAIL DELIVERY (Feature Dependent on notifications.email_enabled and EMAIL_PROVIDER !== null)
    const isEmailFeatureEnabled = PlatformConfigStore.getBoolean("notifications.email_enabled", true);
    const emailProvider = (process.env.EMAIL_PROVIDER || "null").toLowerCase();
    const emailApiKey = process.env.EMAIL_API_KEY || "";
    const isEmailConfigured = emailProvider !== "null" && Boolean(emailApiKey);

    let emailStatus: EnvVarStatus = "OK";
    let emailMessage = `Configured for ${emailProvider} transactional delivery.`;

    if (isEmailFeatureEnabled && emailProvider !== "null" && !emailApiKey) {
      emailStatus = isProd ? "MISSING" : "OPTIONAL_UNCONFIGURED";
      emailMessage = `EMAIL_API_KEY required for provider ${emailProvider}.`;
    } else if (emailProvider === "null") {
      emailStatus = "OPTIONAL_UNCONFIGURED";
      emailMessage = "EMAIL_PROVIDER is null; operating in skipped delivery mode.";
    }

    items.push({
      variable: "EMAIL_PROVIDER",
      category: "SERVER_ONLY",
      requirement: "OPTIONAL",
      configured: emailProvider !== "null",
      status: "OK",
      message: `Active email provider: ${emailProvider}`,
    });

    items.push({
      variable: "EMAIL_API_KEY",
      category: "SECRET",
      requirement: isEmailFeatureEnabled && emailProvider !== "null" && isProd ? "REQUIRED" : "FEATURE_DEPENDENT",
      configured: Boolean(emailApiKey),
      status: emailStatus,
      message: emailMessage,
    });

    // 6. BACKUP PROVIDER
    const backupProvider = process.env.BACKUP_PROVIDER || "";
    items.push({
      variable: "BACKUP_PROVIDER",
      category: "SERVER_ONLY",
      requirement: "OPTIONAL",
      configured: Boolean(backupProvider),
      status: backupProvider ? "OK" : "OPTIONAL_UNCONFIGURED",
      message: backupProvider
        ? `Backup provider configured: ${backupProvider}`
        : "BACKUP_PROVIDER unconfigured; operating in honest NOT_CONFIGURED mode.",
    });

    // Determine overall validity
    const hasBlockingErrors = items.some((i) => i.status === "MISSING" || i.status === "INVALID");
    const hasWarnings = items.some((i) => i.status === "OPTIONAL_UNCONFIGURED");

    return {
      environment: env,
      isValid: !hasBlockingErrors,
      hasBlockingErrors,
      hasWarnings,
      items,
      checkedAt: new Date().toISOString(),
    };
  }
}
