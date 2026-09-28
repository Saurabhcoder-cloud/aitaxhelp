import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import {
  startPreparationSessionSchema,
  updatePreparationProgressSchema,
} from "@/lib/validations/preparation-session";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session
 * Returns the authenticated user's open preparation session.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const session = await TaxPreparationSessionStore.getCurrent(user.id);
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/tax/preparation/session
 * Starts a session or resumes the existing open session.
 * SECURITY: userId in the body is rejected. Ownership comes from the session.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const rawBody = await readJson(req);
    startPreparationSessionSchema.parse(rawBody);

    const { session, created } = await TaxPreparationSessionStore.start(user.id, user.email);
    return NextResponse.json(
      {
        success: true,
        data: session,
      },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/tax/preparation/session
 * Advances the authenticated user's current preparation step.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const rawBody = await readJson(req);
    const validated = updatePreparationProgressSchema.parse(rawBody);
    const session = await TaxPreparationSessionStore.updateProgress(user.id, validated.completeStep);
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function requireUser(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
  }
  return user;
}

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    const text = await req.text();
    if (!text.trim()) {
      return {};
    }
    return JSON.parse(text) as unknown;
  } catch (_err) {
    throw new AppError("Malformed JSON in request body.", 400, "BAD_REQUEST");
  }
}
