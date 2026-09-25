/**
 * Supabase Architecture Configuration
 *
 * NOTE: Live Supabase connection is NOT required for the initial foundation phase.
 * Placeholders are safely detected without throwing errors.
 */

export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  isConfigured(): boolean {
    return Boolean(
      this.url &&
        this.publishableKey &&
        !this.url.includes("your-project") &&
        this.url.startsWith("https://")
    );
  },
};
