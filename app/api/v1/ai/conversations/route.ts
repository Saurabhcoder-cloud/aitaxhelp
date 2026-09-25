import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { ConversationStore } from "@/lib/services/conversation-store";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * GET /api/v1/ai/conversations
 * Lists all past AI Assistant conversations for the authenticated user.
 * SECURITY: User identity is extracted exclusively from the verified server session.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError(
        "Authentication required to view past conversations.",
        401,
        "UNAUTHORIZED"
      );
    }

    const conversations = await ConversationStore.listUserConversations(user.id);

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
