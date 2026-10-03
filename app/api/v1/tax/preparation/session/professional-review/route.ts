import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyUserIsAdmin } from "@/lib/auth/session";
import { ProfessionalReviewCaseStore } from "@/lib/services/professional-review-case-store";
import {
  requestReviewSchema,
  queryReviewCasesSchema,
} from "@/lib/validations/professional-review";
import { handleApiError, AppError } from "@/lib/utils/errors";

/**
 * POST /api/v1/tax/preparation/session/professional-review
 * Taxpayer requests CPA/EA review for an active preparation session.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const rawBody = await req.json();
    const validated = requestReviewSchema.parse(rawBody);

    const reviewCase = await ProfessionalReviewCaseStore.createCase({
      sessionId: validated.sessionId,
      userId: user.id,
      reviewType: validated.reviewType,
      priority: validated.priority,
      taxpayerNotes: validated.taxpayerNotes,
    });

    return NextResponse.json(
      {
        success: true,
        data: reviewCase,
        message: "Professional review requested successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/v1/tax/preparation/session/professional-review
 * Lists cases for the authenticated taxpayer or assigned professional with bounded pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = queryReviewCasesSchema.parse({
      status: searchParams.get("status") || undefined,
      taxYear: searchParams.get("taxYear") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    const sessionId = searchParams.get("sessionId");
    if (sessionId) {
      const singleCase = await ProfessionalReviewCaseStore.getBySessionId(sessionId);
      if (singleCase) {
        const isAdmin = await verifyUserIsAdmin(user.id, user.email);
        if (
          singleCase.userId !== user.id &&
          singleCase.assignedProfessionalId !== user.id &&
          !isAdmin
        ) {
          throw new AppError("Access denied.", 403, "FORBIDDEN");
        }
        return NextResponse.json({
          success: true,
          data: singleCase,
        });
      }
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const isAdmin = await verifyUserIsAdmin(user.id, user.email);
    const filter: Parameters<typeof ProfessionalReviewCaseStore.listCases>[0] = {
      status: parsedQuery.status,
      taxYear: parsedQuery.taxYear,
      page: parsedQuery.page,
      limit: parsedQuery.limit,
    };

    const roleQuery = searchParams.get("role");
    if (!isAdmin) {
      if (roleQuery === "professional") {
        filter.assignedProfessionalId = user.id;
      } else {
        filter.userId = user.id;
      }
    } else {
      if (searchParams.get("userId")) {
        filter.userId = searchParams.get("userId")!;
      }
      if (searchParams.get("assignedProfessionalId")) {
        filter.assignedProfessionalId = searchParams.get("assignedProfessionalId")!;
      }
    }

    const result = await ProfessionalReviewCaseStore.listCases(filter);

    return NextResponse.json({
      success: true,
      data: result.cases,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
