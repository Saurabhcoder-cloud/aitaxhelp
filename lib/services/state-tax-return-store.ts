/**
 * State Tax Return Persistence Store — Phase 11
 *
 * Resilient, dual-mode persistence layer for canonical StateReturn documents,
 * frozen snapshots, and cryptographic checksums.
 *
 * ARCHITECTURAL INVARIANT:
 * - Dual mode: Supabase client with in-memory fallback.
 * - Idempotency guaranteed.
 * - Snapshot invalidation when underlying session data mutates.
 */

import { StateReturn } from "../state-tax/types";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { AppError } from "@/lib/utils/errors";

declare global {
  // eslint-disable-next-line no-var
  var __stateTaxReturnStore: Map<string, StateReturn> | undefined;
}

function getMemoryStore(): Map<string, StateReturn> {
  if (!globalThis.__stateTaxReturnStore) {
    globalThis.__stateTaxReturnStore = new Map<string, StateReturn>();
  }
  return globalThis.__stateTaxReturnStore;
}

function makeKey(sessionId: string, stateCode: string): string {
  return `${sessionId}::${stateCode.toUpperCase().trim()}`;
}

export class StateTaxReturnStore {
  public static async saveStateReturn(stateReturn: StateReturn): Promise<void> {
    const key = makeKey(stateReturn.sessionId, stateReturn.metadata.stateCode);

    // Save to memory store
    getMemoryStore().set(key, JSON.parse(JSON.stringify(stateReturn)));

    // Save to Supabase if configured
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = await getServerSupabaseClient();
        if (supabase) {
          const client = supabase as any;
          await client.from("state_tax_returns").upsert(
            {
              session_id: stateReturn.sessionId,
              user_id: stateReturn.userId,
              state_code: stateReturn.metadata.stateCode.toUpperCase(),
              tax_year: stateReturn.metadata.taxYear,
              engine_version: stateReturn.metadata.engineVersion,
              rules_version: stateReturn.metadata.rulesVersion,
              is_frozen: stateReturn.metadata.isFrozen ?? false,
              frozen_at: stateReturn.metadata.frozenAt,
              checksum_sha256: stateReturn.metadata.checksumSha256 || "",
              state_return_snapshot: stateReturn,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "session_id,state_code" }
          );
        }
      } catch (_err) {
        // Fall back gracefully to in-memory store
      }
    }
  }

  public static async getStateReturn(
    sessionId: string,
    stateCode: string
  ): Promise<StateReturn | null> {
    const key = makeKey(sessionId, stateCode);
    const inMem = getMemoryStore().get(key);
    if (inMem) return inMem;

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = await getServerSupabaseClient();
        if (supabase) {
          const client = supabase as any;
          const { data } = await client
            .from("state_tax_returns")
            .select("state_return_snapshot")
            .eq("session_id", sessionId)
            .eq("state_code", stateCode.toUpperCase().trim())
            .single();

          if (data?.state_return_snapshot) {
            const ret = data.state_return_snapshot as StateReturn;
            getMemoryStore().set(key, ret);
            return ret;
          }
        }
      } catch (_err) {
        // Fallback
      }
    }

    return null;
  }

  public static async freezeStateReturn(
    sessionId: string,
    stateCode: string
  ): Promise<StateReturn> {
    const existing = await this.getStateReturn(sessionId, stateCode);
    if (!existing) {
      throw new AppError(
        `No state return found for session ${sessionId} and state ${stateCode}.`,
        404,
        "NOT_FOUND"
      );
    }

    existing.metadata.isFrozen = true;
    existing.metadata.frozenAt = new Date().toISOString();

    await this.saveStateReturn(existing);
    return existing;
  }

  public static async invalidateStateReturn(
    sessionId: string,
    stateCode?: string
  ): Promise<void> {
    const memStore = getMemoryStore();

    if (stateCode) {
      const key = makeKey(sessionId, stateCode);
      const existing = memStore.get(key);
      if (existing) {
        existing.metadata.isFrozen = false;
        existing.metadata.frozenAt = null;
        await this.saveStateReturn(existing);
      }
    } else {
      // Invalidate all state returns for this session
      for (const [key, ret] of memStore.entries()) {
        if (key.startsWith(`${sessionId}::`)) {
          ret.metadata.isFrozen = false;
          ret.metadata.frozenAt = null;
          await this.saveStateReturn(ret);
        }
      }
    }
  }

  public static clearStore(): void {
    getMemoryStore().clear();
  }
}
