import { SUPABASE_CONFIG } from "./config";

/**
 * Server-side boundary for Supabase operations (Server Components & API Route Handlers).
 * Never exposes service-role keys.
 */
export function getServerSupabaseClient() {
  if (!SUPABASE_CONFIG.isConfigured()) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      from: (_tableName: string) => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
      }),
      isConfigured: false,
    };
  }

  // Future integration point for createServerClient from @supabase/ssr
  return {
    isConfigured: true,
  };
}
