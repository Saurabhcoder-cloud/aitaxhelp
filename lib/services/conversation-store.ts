import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { AIMessageRecord, ConversationSummary } from "@/types/ai";

interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredMessage extends AIMessageRecord {
  userId: string;
}

// Global cache for development hot reloads and test suite resets
declare global {
  // eslint-disable-next-line no-var
  var __conversationStore: Map<string, ConversationRecord> | undefined;
  // eslint-disable-next-line no-var
  var __messageStore: StoredMessage[] | undefined;
}

function getMemoryStores() {
  if (!globalThis.__conversationStore) {
    globalThis.__conversationStore = new Map<string, ConversationRecord>();
  }
  if (!globalThis.__messageStore) {
    globalThis.__messageStore = [];
  }
  return {
    conversations: globalThis.__conversationStore,
    messages: globalThis.__messageStore,
  };
}

export class ConversationStore {
  /**
   * Retrieves an existing conversation owned by the user, or creates a new one.
   * SECURITY: Strictly enforces user ownership.
   */
  public static async getOrCreateConversation(
    userId: string,
    conversationId?: string,
    initialTitle = "Tax Assistance Session"
  ): Promise<ConversationRecord> {
    const { conversations } = getMemoryStores();

    if (conversationId) {
      if (SUPABASE_CONFIG.isConfigured()) {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                eq: (col2: string, val2: string) => {
                  single: () => Promise<{
                    data: { id: string; user_id: string; title: string; created_at: string; updated_at: string } | null;
                    error: { message: string } | null;
                  }>;
                };
              };
            };
          };
        };
        const { data } = await supabase
          .from("ai_conversations")
          .select("*")
          .eq("id", conversationId)
          .eq("user_id", userId)
          .single();

        if (data) {
          return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } else {
        const existing = conversations.get(conversationId);
        if (existing && existing.userId === userId) {
          return existing;
        }
      }
    }

    // Create new conversation
    const newId = conversationId || crypto.randomUUID();
    const now = new Date().toISOString();
    const newRecord: ConversationRecord = {
      id: newId,
      userId,
      title: initialTitle,
      createdAt: now,
      updatedAt: now,
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          insert: (values: unknown) => {
            select: () => {
              single: () => Promise<{
                data: { id: string; user_id: string; title: string; created_at: string; updated_at: string } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          id: newRecord.id,
          user_id: userId,
          title: newRecord.title,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          title: data.title,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    }

    conversations.set(newRecord.id, newRecord);
    return newRecord;
  }

  /**
   * Persists a chat message in the conversation.
   */
  public static async saveMessage(
    conversationId: string,
    userId: string,
    role: "user" | "assistant" | "system",
    content: string,
    attachedCalculationId?: string
  ): Promise<AIMessageRecord> {
    const { messages, conversations } = getMemoryStores();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record: StoredMessage = {
      id,
      conversationId,
      userId,
      role,
      content,
      attachedCalculationId,
      createdAt: now,
    };

    // Update conversation updatedAt
    const conv = conversations.get(conversationId);
    if (conv) {
      conv.updatedAt = now;
      if (conv.title === "Tax Assistance Session" && role === "user") {
        conv.title = content.slice(0, 40) + (content.length > 40 ? "..." : "");
      }
    }

    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          insert: (values: unknown) => Promise<{ error: { message: string } | null }>;
        };
      };
      await supabase.from("ai_messages").insert({
        id: record.id,
        conversation_id: conversationId,
        role: record.role,
        content: record.content,
        attached_calculation_id: attachedCalculationId || null,
        created_at: now,
      });
    }

    messages.push(record);
    return {
      id: record.id,
      conversationId: record.conversationId,
      role: record.role,
      content: record.content,
      attachedCalculationId: record.attachedCalculationId,
      createdAt: record.createdAt,
    };
  }

  /**
   * Retrieves messages for a conversation, verifying that the user owns the conversation.
   * SECURITY: Returns empty array if conversation is not owned by user.
   */
  public static async getConversationMessages(
    conversationId: string,
    userId: string
  ): Promise<AIMessageRecord[]> {
    const { conversations, messages } = getMemoryStores();

    // Verify conversation ownership
    if (SUPABASE_CONFIG.isConfigured()) {
      const supabase = getServerSupabaseClient() as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              eq?: (col2: string, val2: string) => {
                single: () => Promise<{ data: { id: string } | null }>;
              };
              order?: (col: string, opts: { ascending: boolean }) => Promise<{
                data: Array<{
                  id: string;
                  conversation_id: string;
                  role: "user" | "assistant" | "system";
                  content: string;
                  attached_calculation_id?: string;
                  created_at: string;
                }> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };

      // 1. Verify user owns conversation
      const { data: convData } = await (supabase.from("ai_conversations")
        .select("id")
        .eq("id", conversationId) as unknown as { eq: (c: string, v: string) => { single: () => Promise<{ data: { id: string } | null }> } })
        .eq("user_id", userId)
        .single();

      if (!convData) {
        return [];
      }

      // 2. Fetch messages
      const { data } = await (supabase.from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId) as unknown as { order: (c: string, o: { ascending: boolean }) => Promise<{ data: Array<{ id: string; conversation_id: string; role: "user" | "assistant" | "system"; content: string; attached_calculation_id?: string; created_at: string }> | null; error: { message: string } | null }> })
        .order("created_at", { ascending: true });

      return (data || []).map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role,
        content: m.content,
        attachedCalculationId: m.attached_calculation_id,
        createdAt: m.created_at,
      }));
    }

    const conv = conversations.get(conversationId);
    if (!conv || conv.userId !== userId) {
      return [];
    }

    return messages
      .filter((m) => m.conversationId === conversationId && m.userId === userId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        attachedCalculationId: m.attachedCalculationId,
        createdAt: m.createdAt,
      }));
  }

  /**
   * Lists all conversations owned by a user for the dashboard.
   */
  public static async listUserConversations(userId: string): Promise<ConversationSummary[]> {
    const { conversations, messages } = getMemoryStores();

    const userConvs: ConversationSummary[] = [];
    for (const conv of conversations.values()) {
      if (conv.userId === userId) {
        const convMessages = messages.filter((m) => m.conversationId === conv.id);
        const lastMsg = convMessages[convMessages.length - 1]?.content;
        userConvs.push({
          id: conv.id,
          title: conv.title,
          lastMessage: lastMsg,
          messageCount: convMessages.length,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        });
      }
    }

    return userConvs.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public static clear(): void {
    if (globalThis.__conversationStore) {
      globalThis.__conversationStore.clear();
    }
    if (globalThis.__messageStore) {
      globalThis.__messageStore = [];
    }
  }
}
