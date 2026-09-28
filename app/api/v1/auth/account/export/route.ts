import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { AccountDataService } from "@/lib/services/account-data";
import { handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/v1/auth/account/export
 * Exports an authenticated user's complete personal tax data package.
 *
 * PRIVACY & SECURITY:
 * 1. Requires valid authentication session.
 * 2. Strictly scopes to the server-verified user ID.
 * 3. Excludes admin notes, system audit logs, and internal secrets.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required to export your account data.",
          },
        },
        { status: 401 }
      );
    }

    const exportData = await AccountDataService.exportUserData(user.id, user.email);

    const filename = `taxaihelp-data-export-${user.id}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
