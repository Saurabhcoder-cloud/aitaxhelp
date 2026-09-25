import { SUPABASE_CONFIG } from "./config";

/**
 * Client-side boundary for Supabase authentication and database interactions.
 * Safe for execution in browser environments.
 */
export function getBrowserSupabaseClient() {
  if (!SUPABASE_CONFIG.isConfigured()) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: (_tableName: string) => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
      }),
      isConfigured: false,
    };
  }

  // Future integration point for createBrowserClient from @supabase/ssr
  return {
    isConfigured: true,
  };
}
