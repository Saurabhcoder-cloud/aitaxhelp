import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { SubscriptionStore } from "@/lib/services/subscription-store";
import { PaymentProviderFactory } from "@/lib/services/payment-provider";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { FeatureFlags } from "@/lib/services/feature-flags";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw new AppError(
        "Authentication required to access customer billing portal.",
        401,
        "UNAUTHORIZED"
      );
    }

    // Check central feature flags
    await FeatureFlags.require("billing.enabled", "Billing Subsystem");

    // Retrieve user's subscription to get verified providerCustomerId
    const sub = await SubscriptionStore.getByUserId(user.id);
    if (!sub || !sub.providerCustomerId) {
      throw new AppError(
        "No active payment profile or Stripe customer account found for this user.",
        404,
        "CUSTOMER_NOT_FOUND"
      );
    }

    const provider = PaymentProviderFactory.getProvider();
    const returnUrl = `${req.nextUrl.origin}/dashboard/billing`;

    const portal = await provider.createPortalSession(sub.providerCustomerId, returnUrl);

    return NextResponse.json({
      success: true,
      data: {
        url: portal.url,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
