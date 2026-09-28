import { NextRequest, NextResponse } from "next/server";
import { PaymentProviderFactory } from "@/lib/services/payment-provider";
import { handleApiError, AppError } from "@/lib/utils/errors";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    const provider = PaymentProviderFactory.getProvider();

    if (!provider.isConfigured()) {
      throw new AppError(
        "Payment provider webhook is not configured for production events.",
        400,
        "WEBHOOK_NOT_CONFIGURED"
      );
    }

    const isValid = await provider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new AppError("Invalid or missing webhook signature.", 401, "UNAUTHORIZED_WEBHOOK");
    }

    // When valid, webhook handling would dispatch events (e.g. checkout.session.completed)
    return NextResponse.json({
      received: true,
      message: "Webhook verified successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
