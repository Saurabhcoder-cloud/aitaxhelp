import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { FeatureFlags } from "@/lib/services/feature-flags";

const recoverySchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
});

/**
 * POST /api/v1/auth/recovery
 * Handles password recovery / reset request.
 */
export async function POST(req: NextRequest) {
  try {
    await FeatureFlags.require("auth.password_reset_enabled", "Password Recovery");

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_err) {
      throw new AppError("Malformed JSON in request body.", 400, "BAD_REQUEST");
    }

    const { email } = recoverySchema.parse(rawBody);

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          auth: {
            resetPasswordForEmail?: (email: string) => Promise<{ error: { message: string } | null }>;
          };
        };

        if (typeof supabase.auth?.resetPasswordForEmail === "function") {
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          if (error) {
            throw new AppError(error.message, 400, "AUTH_ERROR");
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            delivered: true,
            message: `If an account exists for ${email}, a password reset link has been dispatched to your inbox.`,
          },
        });
      } catch (err: unknown) {
        if (err instanceof AppError) throw err;
        throw new AppError("Unable to process password recovery at this time.", 500, "INTERNAL_ERROR");
      }
    }

    // Without Supabase: return the same privacy-safe generic message
    // INVARIANT: Never expose whether an account exists or reveal implementation details.
    return NextResponse.json({
      success: true,
      data: {
        delivered: false,
        message: `If an account exists for that email address, a password reset link will be sent to your inbox.`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
