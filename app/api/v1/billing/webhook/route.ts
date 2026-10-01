import { NextRequest, NextResponse } from "next/server";
import { PaymentProviderFactory } from "@/lib/services/payment-provider";
import { SubscriptionStore } from "@/lib/services/subscription-store";
import { SubscriptionEventStore } from "@/lib/services/subscription-event-store";
import { StripeWebhookEventStore } from "@/lib/services/stripe-webhook-event-store";
import { NotificationService } from "@/lib/notifications/service";
import { PlanId, SubscriptionStatus } from "@/types/monetization";
import { handleApiError, AppError } from "@/lib/utils/errors";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    if (!rawBody || rawBody.trim().length === 0) {
      throw new AppError("Empty request body.", 400, "EMPTY_PAYLOAD");
    }

    const provider = PaymentProviderFactory.getProvider();

    // 1. Cryptographically verify Stripe webhook signature (HMAC-SHA256 with timestamp tolerance)
    let event;
    try {
      event = await provider.verifyWebhookSignature(rawBody, signature);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Webhook signature verification failed.";
      throw new AppError(msg, 400, "INVALID_WEBHOOK_SIGNATURE");
    }

    // 2. Webhook Idempotency Check: if event ID was already processed, return 200 immediately
    const alreadyProcessed = await StripeWebhookEventStore.isProcessed(event.id);
    if (alreadyProcessed) {
      return NextResponse.json({
        received: true,
        idempotent: true,
        message: `Event ${event.id} already processed. Skipping duplicate execution.`,
      });
    }

    // 3. Dispatch and process supported Stripe events
    const eventType = event.type;
    const eventObject = event.data.object as Record<string, any>;

    switch (eventType) {
      case "checkout.session.completed": {
        const userId =
          eventObject.metadata?.userId ||
          eventObject.client_reference_id;
        const planId = (eventObject.metadata?.planId as PlanId) || "premium";
        const customerId = eventObject.customer as string | undefined;
        const subscriptionId = eventObject.subscription as string | undefined;

        if (userId) {
          const now = new Date();
          const periodEnd = new Date(now.getTime() + 30 * 86400000);

          await SubscriptionStore.saveSubscription({
            userId,
            planId,
            status: "active",
            provider: "stripe",
            providerCustomerId: customerId,
            providerSubscriptionId: subscriptionId,
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
            cancelAtPeriodEnd: false,
          });

          await SubscriptionEventStore.log({
            userId,
            eventType: "subscription_created",
            payload: {
              planId,
              stripeEventId: event.id,
              customerId,
              subscriptionId,
            },
          });

          // Send confirmation notification
          try {
            await NotificationService.dispatchNotification({
              userId,
              category: "billing",
              type: "subscription_started",
              title: "Premium Subscription Activated",
              message: "Thank you for upgrading! Your Premium features and high-capacity AI are now active.",
              actionUrl: "/dashboard/billing",
              actionLabel: "View Billing",
            });
          } catch (_e) {
            // Non-blocking notification dispatch
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const customerId = eventObject.customer as string | undefined;
        const subscriptionId = eventObject.id as string | undefined;
        const status = (eventObject.status as SubscriptionStatus) || "active";

        let userSub =
          (eventObject.metadata?.userId &&
            (await SubscriptionStore.getByUserId(eventObject.metadata.userId))) ||
          (subscriptionId &&
            (await SubscriptionStore.getByProviderSubscriptionId(subscriptionId))) ||
          (customerId && (await SubscriptionStore.getByProviderCustomerId(customerId)));

        const userId = eventObject.metadata?.userId || userSub?.userId;
        if (userId) {
          const planId = (eventObject.metadata?.planId as PlanId) || userSub?.planId || "premium";
          const start = eventObject.current_period_start
            ? new Date(eventObject.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const end = eventObject.current_period_end
            ? new Date(eventObject.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 86400000).toISOString();

          await SubscriptionStore.saveSubscription({
            id: userSub?.id,
            userId,
            planId,
            status: status === "active" || status === "trialing" ? status : "active",
            provider: "stripe",
            providerCustomerId: customerId,
            providerSubscriptionId: subscriptionId,
            currentPeriodStart: start,
            currentPeriodEnd: end,
            cancelAtPeriodEnd: Boolean(eventObject.cancel_at_period_end),
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscriptionId = eventObject.id as string | undefined;
        const customerId = eventObject.customer as string | undefined;

        let userSub =
          (eventObject.metadata?.userId &&
            (await SubscriptionStore.getByUserId(eventObject.metadata.userId))) ||
          (subscriptionId &&
            (await SubscriptionStore.getByProviderSubscriptionId(subscriptionId))) ||
          (customerId && (await SubscriptionStore.getByProviderCustomerId(customerId)));

        if (userSub) {
          const rawStatus = eventObject.status as string;
          let status: SubscriptionStatus = "active";
          if (rawStatus === "trialing") status = "trialing";
          else if (rawStatus === "past_due") status = "past_due";
          else if (rawStatus === "canceled") status = "canceled";
          else if (rawStatus === "unpaid") status = "unpaid";
          else if (rawStatus === "incomplete") status = "incomplete";
          else if (rawStatus === "incomplete_expired") status = "expired";
          else if (rawStatus === "active") status = "active";

          const cancelAtPeriodEnd = Boolean(eventObject.cancel_at_period_end);
          const start = eventObject.current_period_start
            ? new Date(eventObject.current_period_start * 1000).toISOString()
            : userSub.currentPeriodStart;
          const end = eventObject.current_period_end
            ? new Date(eventObject.current_period_end * 1000).toISOString()
            : userSub.currentPeriodEnd;

          await SubscriptionStore.saveSubscription({
            id: userSub.id,
            userId: userSub.userId,
            planId: userSub.planId,
            status,
            provider: "stripe",
            providerCustomerId: customerId || userSub.providerCustomerId,
            providerSubscriptionId: subscriptionId || userSub.providerSubscriptionId,
            currentPeriodStart: start,
            currentPeriodEnd: end,
            cancelAtPeriodEnd,
          });

          await SubscriptionEventStore.log({
            userId: userSub.userId,
            subscriptionId: userSub.id,
            eventType: "subscription_updated",
            payload: {
              status,
              cancelAtPeriodEnd,
              stripeEventId: event.id,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscriptionId = eventObject.id as string | undefined;
        const customerId = eventObject.customer as string | undefined;

        let userSub =
          (eventObject.metadata?.userId &&
            (await SubscriptionStore.getByUserId(eventObject.metadata.userId))) ||
          (subscriptionId &&
            (await SubscriptionStore.getByProviderSubscriptionId(subscriptionId))) ||
          (customerId && (await SubscriptionStore.getByProviderCustomerId(customerId)));

        if (userSub) {
          await SubscriptionStore.saveSubscription({
            id: userSub.id,
            userId: userSub.userId,
            planId: userSub.planId,
            status: "canceled",
            provider: "stripe",
            providerCustomerId: customerId || userSub.providerCustomerId,
            providerSubscriptionId: subscriptionId || userSub.providerSubscriptionId,
            currentPeriodStart: userSub.currentPeriodStart,
            currentPeriodEnd: new Date().toISOString(),
            cancelAtPeriodEnd: false,
          });

          await SubscriptionEventStore.log({
            userId: userSub.userId,
            subscriptionId: userSub.id,
            eventType: "subscription_canceled",
            payload: {
              stripeEventId: event.id,
            },
          });
        }
        break;
      }

      case "invoice.paid": {
        const subscriptionId = eventObject.subscription as string | undefined;
        const customerId = eventObject.customer as string | undefined;

        let userSub =
          (subscriptionId &&
            (await SubscriptionStore.getByProviderSubscriptionId(subscriptionId))) ||
          (customerId && (await SubscriptionStore.getByProviderCustomerId(customerId)));

        if (userSub) {
          // Confirm active status on successful invoice payment
          await SubscriptionStore.saveSubscription({
            ...userSub,
            status: "active",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const subscriptionId = eventObject.subscription as string | undefined;
        const customerId = eventObject.customer as string | undefined;

        let userSub =
          (subscriptionId &&
            (await SubscriptionStore.getByProviderSubscriptionId(subscriptionId))) ||
          (customerId && (await SubscriptionStore.getByProviderCustomerId(customerId)));

        if (userSub) {
          await SubscriptionStore.saveSubscription({
            ...userSub,
            status: "past_due",
          });

          await SubscriptionEventStore.log({
            userId: userSub.userId,
            subscriptionId: userSub.id,
            eventType: "payment_failed",
            payload: {
              stripeEventId: event.id,
              attemptCount: eventObject.attempt_count,
            },
          });

          try {
            await NotificationService.dispatchNotification({
              userId: userSub.userId,
              category: "billing",
              type: "payment_failed",
              title: "Subscription Payment Failed",
              message: "We were unable to process your subscription renewal. Please update your payment method.",
              actionUrl: "/dashboard/billing",
              actionLabel: "Update Payment Method",
            });
          } catch (_e) {
            // Non-blocking notification dispatch
          }
        }
        break;
      }

      default:
        // Gracefully ignore unhandled event types
        break;
    }

    // 4. Mark event ID as processed to guarantee idempotency on retries
    await StripeWebhookEventStore.recordProcessed(event.id, event.type);

    return NextResponse.json({
      received: true,
      eventId: event.id,
      eventType: event.type,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
