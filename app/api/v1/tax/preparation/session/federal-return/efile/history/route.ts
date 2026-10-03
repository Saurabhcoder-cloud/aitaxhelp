import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { EfileSubmissionStore } from "@/lib/services/efile-submission-store";
import { AppError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/tax/preparation/session/federal-return/efile/history
 * Returns the submission lifecycle history and audit event log for the authenticated session.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const session = await TaxPreparationSessionStore.getCurrent(user.id);
    if (!session) {
      throw new AppError("No open tax preparation session found.", 404, "NOT_FOUND");
    }

    const submission = await EfileSubmissionStore.getLatestForSession(session.id);
    if (!submission) {
      return NextResponse.json({
        success: true,
        data: {
          submission: null,
          events: [],
        },
      });
    }

    const events = await EfileSubmissionStore.listEvents(submission.id);

    return NextResponse.json({
      success: true,
      data: {
        submission,
        events,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
