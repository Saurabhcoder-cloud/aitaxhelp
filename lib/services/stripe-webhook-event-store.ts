import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";

interface ProcessedEventRecord {
  eventId: string;
  eventType: string;
  processedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __stripeWebhookEventStore: Map<string, ProcessedEventRecord> | undefined;
}

function getMemoryStore(): Map<string, ProcessedEventRecord> {
  if (!globalThis.__stripeWebhookEventStore) {
    globalThis.__stripeWebhookEventStore = new Map<string, ProcessedEventRecord>();
  }
  return globalThis.__stripeWebhookEventStore;
}

export class StripeWebhookEventStore {
  /**
   * Checks whether a Stripe event ID (e.g. evt_...) has already been processed.
   * Guarantees webhook idempotency and protects against duplicate processing on Stripe retries.
   */
  public static async isProcessed(eventId: string): Promise<boolean> {
    if (!eventId) return false;

    // Check memory first (fastest)
    const memStore = getMemoryStore();
    if (memStore.has(eventId)) {
      return true;
    }

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{
                  data: { event_id: string } | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };

        const { data, error } = await supabase
          .from("stripe_webhook_events")
          .select("event_id")
          .eq("event_id", eventId)
          .maybeSingle();

        if (!error && data) {
          // Warm memory cache
          memStore.set(eventId, {
            eventId,
            eventType: "unknown",
            processedAt: new Date().toISOString(),
          });
          return true;
        }
      } catch (_err) {
        // Fall back to memory store if table is not yet migrated
      }
    }

    return false;
  }

  /**
   * Records a Stripe event ID as processed.
   */
  public static async recordProcessed(eventId: string, eventType: string): Promise<void> {
    if (!eventId) return;

    const record: ProcessedEventRecord = {
      eventId,
      eventType,
      processedAt: new Date().toISOString(),
    };

    const memStore = getMemoryStore();
    memStore.set(eventId, record);

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            insert: (values: unknown) => Promise<{ error: { message: string } | null }>;
          };
        };

        await supabase.from("stripe_webhook_events").insert({
          event_id: eventId,
          event_type: eventType,
          processed_at: record.processedAt,
        });
      } catch (_err) {
        // Non-blocking fallback to memory store
      }
    }
  }

  public static clearStore(): void {
    if (globalThis.__stripeWebhookEventStore) {
      globalThis.__stripeWebhookEventStore.clear();
    }
  }

  public static clear(): void {
    StripeWebhookEventStore.clearStore();
  }
}
