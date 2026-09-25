import {
  AIAssistantRequest,
  AIAssistantResponse,
  ConversationSummary,
  AIMessageRecord,
} from "@/types/ai";
import { getClientAuthHeaders } from "./calculation-history-api";

export interface AssistantApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Sends a message to the AI Tax Assistant with client authentication.
 */
export async function sendAssistantMessage(
  payload: AIAssistantRequest
): Promise<AssistantApiResponse<AIAssistantResponse>> {
  try {
    const res = await fetch("/api/v1/ai/assistant", {
      method: "POST",
      headers: getClientAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to process query.",
      };
    }

    return {
      success: true,
      data: json.data as AIAssistantResponse,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while contacting AI Assistant.",
    };
  }
}

/**
 * Lists all conversations for the authenticated user.
 */
export async function fetchUserConversations(): Promise<
  AssistantApiResponse<ConversationSummary[]>
> {
  try {
    const res = await fetch("/api/v1/ai/conversations", {
      method: "GET",
      headers: getClientAuthHeaders(),
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to load conversations.",
      };
    }

    return {
      success: true,
      data: json.data as ConversationSummary[],
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while fetching conversations.",
    };
  }
}

/**
 * Retrieves the messages for a specific conversation.
 */
export async function fetchConversationMessages(
  conversationId: string
): Promise<AssistantApiResponse<AIMessageRecord[]>> {
  try {
    const res = await fetch(`/api/v1/ai/conversations/${encodeURIComponent(conversationId)}`, {
      method: "GET",
      headers: getClientAuthHeaders(),
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to load conversation history.",
      };
    }

    return {
      success: true,
      data: json.data as AIMessageRecord[],
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while fetching conversation messages.",
    };
  }
}
