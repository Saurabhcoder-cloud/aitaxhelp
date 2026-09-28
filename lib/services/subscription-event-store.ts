import { SubscriptionEvent } from "@/types/monetization";

declare global {
  // eslint-disable-next-line no-var
  var __subscriptionEventsStore: SubscriptionEvent[] | undefined;
}

function getMemoryStore(): SubscriptionEvent[] {
  if (!globalThis.__subscriptionEventsStore) {
    globalThis.__subscriptionEventsStore = [];
  }
  return globalThis.__subscriptionEventsStore;
}

export class SubscriptionEventStore {
  /**
   * Appends an immutable subscription lifecycle event server-side.
   */
  public static async log(
    event: Omit<SubscriptionEvent, "id" | "createdAt">
  ): Promise<SubscriptionEvent> {
    const store = getMemoryStore();
    const record: SubscriptionEvent = {
      id: crypto.randomUUID(),
      userId: event.userId,
      subscriptionId: event.subscriptionId,
      eventType: event.eventType,
      payload: event.payload,
      createdAt: new Date().toISOString(),
    };
    store.push(record);
    return record;
  }

  /**
   * Lists events for a user in reverse chronological order.
   */
  public static async listByUser(userId: string): Promise<SubscriptionEvent[]> {
    const store = getMemoryStore();
    const filtered = store
      .filter((e) => e.userId === userId)
      .map((e, _i) => ({ e, idx: store.indexOf(e) }));
    filtered.sort((a, b) => {
      const timeDiff = new Date(b.e.createdAt).getTime() - new Date(a.e.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.idx - a.idx; // later insertion = newer = comes first
    });
    return filtered.map((x) => x.e);
  }

  /**
   * Admin-only: Lists all recent subscription events.
   */
  public static async listRecent(limit = 50): Promise<SubscriptionEvent[]> {
    const store = getMemoryStore();
    return [...store]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public static clearStore(): void {
    if (globalThis.__subscriptionEventsStore) {
      globalThis.__subscriptionEventsStore = [];
    }
  }

  public static clear(): void {
    SubscriptionEventStore.clearStore();
  }
}
