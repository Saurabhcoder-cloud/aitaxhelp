import { SUPABASE_CONFIG } from "./config";

export interface ServerSupabaseUser {
  id: string;
  email?: string;
}

export interface ServerSupabaseAuthResponse {
  data: { user: ServerSupabaseUser | null };
  error: { message: string } | null;
}

export interface ServerSupabaseClient {
  auth: {
    getUser: (jwt?: string) => Promise<ServerSupabaseAuthResponse>;
  };
  from: (tableName: string) => {
    select: (columns?: string) => unknown;
    insert: (values: unknown) => unknown;
    update: (values: unknown) => unknown;
    delete: (opts?: unknown) => unknown;
  };
  isConfigured: boolean;
}

/**
 * Server-side boundary for Supabase operations (Server Components & API Route Handlers).
 * Never exposes service-role keys.
 */
export function getServerSupabaseClient(): ServerSupabaseClient {
  if (!SUPABASE_CONFIG.isConfigured()) {
    return {
      auth: {
        getUser: async (_jwt?: string): Promise<ServerSupabaseAuthResponse> => ({
          data: { user: null },
          error: null,
        }),
      },
      from: (_tableName: string) => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
      }),
      isConfigured: false,
    };
  }

  // Future integration point for createServerClient from @supabase/ssr
  return {
    auth: {
      getUser: async (_jwt?: string): Promise<ServerSupabaseAuthResponse> => ({
        data: { user: null },
        error: null,
      }),
    },
    from: (_tableName: string) => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
    isConfigured: true,
  };
}

