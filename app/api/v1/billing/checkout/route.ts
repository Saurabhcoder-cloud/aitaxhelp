import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { PaymentProviderFactory } from "@/lib/services/payment-provider";
import { SubscriptionEventStore } from "@/lib/services/subscription-event-store";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { FeatureFlags } from "@/lib/services/feature-flags";
import { z } from "zod";

const checkoutSchema = z.object({
  planId: z.enum(["free", "premium"]),
  interval: z.enum(["monthly", "annual"]).default("monthly"),
  returnUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError("Authentication required to initiate checkout.", 401, "UNAUTHORIZED");
    }

    // Check central feature flags
    await FeatureFlags.require("billing.enabled", "Billing Subsystem");
    await FeatureFlags.require("billing.premium_checkout_enabled", "Premium Checkout");

    const rawBody = await req.json();
    const validated = checkoutSchema.parse(rawBody);

    if (validated.planId === "free") {
      throw new AppError("The Free plan does not require a checkout session.", 400, "BAD_REQUEST");
    }

    const provider = PaymentProviderFactory.getProvider();
    const returnUrl = validated.returnUrl || `${req.nextUrl.origin}/dashboard/billing`;

    const result = await provider.createCheckoutSession(
      user.id,
      user.email || `${user.id}@taxaihelp.local`,
      validated.planId,
      validated.interval,
      returnUrl
    );

    // Append-only event logging
    await SubscriptionEventStore.log({
      userId: user.id,
      eventType: "checkout_started",
      payload: {
        planId: validated.planId,
        interval: validated.interval,
        isStaging: result.isStaging,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
