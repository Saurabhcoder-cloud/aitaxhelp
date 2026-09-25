import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  aiAssistantRequestSchema,
  aiAssistantResponseSchema,
} from "@/lib/ai/gemini/schemas";
import { processAssistantRequest } from "@/lib/ai/gemini/service";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * POST /api/v1/ai/assistant
 * Production AI Tax Assistant endpoint.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Strict Authentication: User identity is extracted exclusively from the verified server session.
 * 2. Deterministic Engine Authority: Gemini is strictly an educational explanation layer, never the calculation authority.
 * 3. Schema Validation: Request and response boundaries are strictly validated with Zod.
 * 4. Rate Limiting: Abuse protection enforced per user ID.
 * 5. Prompt Injection Defense: Untrusted user input cannot override system policy or manipulate numeric results.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError(
        "Authentication required to use the AI Tax Assistant.",
        401,
        "UNAUTHORIZED"
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_err) {
      throw new AppError("Malformed JSON body in request.", 400, "BAD_REQUEST");
    }

    const validatedRequest = aiAssistantRequestSchema.parse(rawBody);

    const assistantResult = await processAssistantRequest(user, validatedRequest);

    // Strict validation of outgoing payload ensures no internal SDK leaks
    const validatedResponse = aiAssistantResponseSchema.parse(assistantResult);

    return NextResponse.json({
      success: true,
      data: validatedResponse,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
