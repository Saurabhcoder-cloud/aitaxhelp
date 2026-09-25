import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { ConversationStore } from "@/lib/services/conversation-store";
import { handleApiError, AppError } from "@/lib/utils/errors";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/ai/conversations/[id]
 * Retrieves conversation message history, strictly verifying user ownership.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError(
        "Authentication required to view conversation messages.",
        401,
        "UNAUTHORIZED"
      );
    }

    const { id } = params;
    if (!id || typeof id !== "string") {
      throw new AppError("Invalid conversation ID.", 400, "BAD_REQUEST");
    }

    const messages = await ConversationStore.getConversationMessages(id, user.id);

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
