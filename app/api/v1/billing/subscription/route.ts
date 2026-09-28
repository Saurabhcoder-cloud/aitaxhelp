import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { EntitlementService } from "@/lib/services/entitlement-service";
import { handleApiError, AppError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to access subscription details.", 401, "UNAUTHORIZED");
    }

    const snapshot = await EntitlementService.getEntitlementSnapshot(user.id);

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
