import {
  NotificationCategory,
  NotificationType,
  InAppNotification,
  NotificationDeliveryRecord,
  DeliveryStatus,
} from "./types";
import { NotificationStore } from "./store";
import { NotificationPreferencesStore } from "./preferences";
import { NotificationTemplates, escapeHtml } from "./templates";
import { getEmailProvider } from "./providers/email";
import { getEmailConfig } from "./config";

export interface DispatchNotificationOptions {
  userId: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  idempotencyKey?: string;
  emailRecipient?: string;
  emailSubject?: string;
  emailText?: string;
  emailHtml?: string;
  isAdminOnly?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface DispatchResult {
  inAppNotification?: InAppNotification;
  emailDelivery?: NotificationDeliveryRecord;
  skipped: boolean;
  reason?: string;
}

// Track deleted accounts to strictly prevent sending marketing or non-critical notifications after account purge
declare global {
  // eslint-disable-next-line no-var
  var __deletedUserAccountSet: Set<string> | undefined;
}

function getDeletedUserSet(): Set<string> {
  if (!globalThis.__deletedUserAccountSet) {
    globalThis.__deletedUserAccountSet = new Set<string>();
  }
  return globalThis.__deletedUserAccountSet;
}

export class NotificationService {
  /**
   * Registers a user account as deleted.
   * Cancels future non-security communications and prevents zombie reactivation.
   */
  public static markUserDeleted(userId: string): void {
    getDeletedUserSet().add(userId);
  }

  public static isUserDeleted(userId: string): boolean {
    return getDeletedUserSet().has(userId);
  }

  /**
   * Alias for dispatch for backward compatibility.
   */
  public static async dispatchNotification(options: DispatchNotificationOptions): Promise<DispatchResult> {
    return this.dispatch(options);
  }

  /**
   * Core dispatcher that respects user preferences, idempotency keys, and security constraints.
   */
  public static async dispatch(options: DispatchNotificationOptions): Promise<DispatchResult> {
    const { userId, category, type, idempotencyKey, isAdminOnly } = options;

    // 1. Check if account is deleted
    if (this.isUserDeleted(userId)) {
      // Critical security alerts can technically be recorded, but marketing/calculators are strictly stopped
      if (category !== "authentication") {
        return {
          skipped: true,
          reason: "Account is deleted. Notification suppressed.",
        };
      }
    }

    // 2. Check Idempotency Key
    if (idempotencyKey && NotificationStore.isDeliveryIdempotent(idempotencyKey)) {
      return {
        skipped: true,
        reason: "Duplicate event suppressed via idempotency key.",
      };
    }

    // 3. Check User Communication Preferences
    const canSend = await NotificationPreferencesStore.canSend(userId, category);
    if (!canSend) {
      return {
        skipped: true,
        reason: `User has disabled notifications for category '${category}'.`,
      };
    }

    // 4. Create In-App Notification
    const inAppNotification = await NotificationStore.create({
      userId,
      category,
      type,
      title: options.title,
      message: options.message,
      actionUrl: options.actionUrl,
      actionLabel: options.actionLabel,
      isAdminOnly: !!isAdminOnly,
      metadata: options.metadata,
    });

    // 5. Attempt Email Delivery if Recipient Provided
    let emailDelivery: NotificationDeliveryRecord | undefined;
    if (options.emailRecipient && options.emailSubject && options.emailText) {
      const emailProvider = getEmailProvider();
      const sanitizedRecipient = options.emailRecipient.replace(/(?<=^.{2}).*(?=@)/, "***");

      const deliveryRes = await emailProvider.sendEmail({
        to: options.emailRecipient,
        subject: options.emailSubject,
        text: options.emailText,
        html: options.emailHtml,
        category,
        metadata: options.metadata,
      });

      emailDelivery = NotificationStore.recordDelivery({
        userId,
        notificationType: type,
        channel: "email",
        provider: deliveryRes.provider,
        status: deliveryRes.status,
        idempotencyKey,
        recipientSanitized: sanitizedRecipient,
        failureCode: deliveryRes.error,
        metadata: options.metadata,
        sentAt: deliveryRes.success ? deliveryRes.timestamp : undefined,
      });
    } else if (idempotencyKey) {
      // Record the idempotency key for in-app-only notifications so that
      // repeated dispatches with the same key are correctly suppressed.
      NotificationStore.recordDelivery({
        userId,
        notificationType: type,
        channel: "in_app",
        provider: "internal",
        status: "sent",
        idempotencyKey,
        recipientSanitized: "",
        metadata: options.metadata,
      });
    }

    return {
      inAppNotification,
      emailDelivery,
      skipped: false,
    };
  }

  // ============================================================================
  // DOMAIN-SPECIFIC CONVENIENCE METHODS
  // ============================================================================

  /**
   * Dispatches calculation saved in-app notification.
   * INVARIANT: Never puts sensitive tax income/refund numbers in the notification.
   */
  public static async notifyCalculationSaved(
    userId: string,
    calculationId: string,
    title: string,
    email?: string
  ): Promise<DispatchResult> {
    const config = getEmailConfig();
    const tpl = NotificationTemplates.calculationSaved({
      calculationTitle: title,
      calculationId,
      siteUrl: config.siteUrl,
    });

    return this.dispatch({
      userId,
      category: "calculations",
      type: "calculation_saved",
      title: "Tax Calculation Saved",
      message: `Your tax calculation "${title}" has been saved to your account.`,
      actionUrl: "/dashboard/calculations",
      actionLabel: "View Calculations",
      idempotencyKey: `calc_saved_${calculationId}`,
      emailRecipient: email,
      emailSubject: tpl.subject,
      emailText: tpl.text,
      emailHtml: tpl.html,
      metadata: { calculationId },
    });
  }

  /**
   * Dispatches tax report ready notification.
   */
  public static async notifyReportReady(
    userId: string,
    calculationId: string,
    reportTitle: string,
    email?: string
  ): Promise<DispatchResult> {
    const config = getEmailConfig();
    const tpl = NotificationTemplates.taxReportReady({
      reportTitle,
      calculationId,
      siteUrl: config.siteUrl,
    });

    return this.dispatch({
      userId,
      category: "calculations",
      type: "report_ready",
      title: "Tax Report Ready",
      message: `Your tax summary report "${reportTitle}" is ready for download or review.`,
      actionUrl: "/dashboard/calculations",
      actionLabel: "Review Report",
      idempotencyKey: `report_ready_${calculationId}`,
      emailRecipient: email,
      emailSubject: tpl.subject,
      emailText: tpl.text,
      emailHtml: tpl.html,
      metadata: { calculationId },
    });
  }

  /**
   * Dispatches AI 80% usage warning notification.
   * Idempotent once per day to prevent spam.
   */
  public static async notifyAiUsageWarning(
    userId: string,
    usedCount: number,
    maxCount: number,
    dateStr: string,
    email?: string
  ): Promise<DispatchResult> {
    const config = getEmailConfig();
    const tpl = NotificationTemplates.aiQuotaWarning({
      usedCount,
      maxCount,
      siteUrl: config.siteUrl,
    });

    return this.dispatch({
      userId,
      category: "ai",
      type: "ai_usage_limit_warning",
      title: "AI Daily Capacity (80%)",
      message: `You have used ${usedCount} of ${maxCount} daily AI queries. Your quota resets at 00:00 UTC.`,
      actionUrl: "/pricing",
      actionLabel: "View Upgrades",
      idempotencyKey: `ai_quota_80_${userId}_${dateStr}`,
      emailRecipient: email,
      emailSubject: tpl.subject,
      emailText: tpl.text,
      emailHtml: tpl.html,
      metadata: { usedCount, maxCount, dateStr },
    });
  }

  /**
   * Dispatches AI 100% daily limit reached notification.
   * Idempotent once per day.
   */
  public static async notifyAiLimitReached(
    userId: string,
    maxCount: number,
    dateStr: string,
    email?: string
  ): Promise<DispatchResult> {
    const config = getEmailConfig();
    const tpl = NotificationTemplates.aiQuotaReached({
      maxCount,
      siteUrl: config.siteUrl,
    });

    return this.dispatch({
      userId,
      category: "ai",
      type: "ai_daily_limit_reached",
      title: "Daily AI Query Limit Reached",
      message: `You have reached your daily limit of ${maxCount} AI queries. It resets at 00:00 UTC. Core calculators remain free.`,
      actionUrl: "/pricing",
      actionLabel: "Upgrade Plan",
      idempotencyKey: `ai_quota_100_${userId}_${dateStr}`,
      emailRecipient: email,
      emailSubject: tpl.subject,
      emailText: tpl.text,
      emailHtml: tpl.html,
      metadata: { maxCount, dateStr },
    });
  }

  /**
   * Dispatches subscription status change notification.
   */
  public static async notifySubscriptionStarted(
    userId: string,
    planName: string,
    email?: string
  ): Promise<DispatchResult> {
    const config = getEmailConfig();
    const tpl = NotificationTemplates.subscriptionConfirmation({
      planName,
      siteUrl: config.siteUrl,
    });

    return this.dispatch({
      userId,
      category: "billing",
      type: "subscription_started",
      title: "Subscription Activated",
      message: `Your ${planName} subscription is now active with expanded entitlements.`,
      actionUrl: "/dashboard/billing",
      actionLabel: "Manage Billing",
      idempotencyKey: `sub_started_${userId}_${planName}`,
      emailRecipient: email,
      emailSubject: tpl.subject,
      emailText: tpl.text,
      emailHtml: tpl.html,
      metadata: { planName },
    });
  }

  /**
   * Dispatches subscription cancellation notification.
   */
  public static async notifySubscriptionCancelled(
    userId: string,
    planName: string,
    effectiveDate: string,
    email?: string
  ): Promise<DispatchResult> {
    const config = getEmailConfig();
    const tpl = NotificationTemplates.subscriptionCancellation({
      planName,
      effectiveDate,
      siteUrl: config.siteUrl,
    });

    return this.dispatch({
      userId,
      category: "billing",
      type: "subscription_cancelled",
      title: "Subscription Cancelled",
      message: `Your ${planName} subscription has been cancelled. Access continues through ${effectiveDate}.`,
      actionUrl: "/dashboard/billing",
      actionLabel: "View Billing",
      idempotencyKey: `sub_cancelled_${userId}_${effectiveDate}`,
      emailRecipient: email,
      emailSubject: tpl.subject,
      emailText: tpl.text,
      emailHtml: tpl.html,
      metadata: { planName, effectiveDate },
    });
  }

  /**
   * Dispatches professional handoff submission notification.
   */
  public static async notifyProfessionalHandoff(
    userId: string,
    leadId: string,
    email?: string
  ): Promise<DispatchResult> {
    const config = getEmailConfig();
    const tpl = NotificationTemplates.professionalHandoffReceived({
      leadId,
      siteUrl: config.siteUrl,
    });

    return this.dispatch({
      userId,
      category: "professional",
      type: "professional_handoff_submitted",
      title: "Professional Consultation Submitted",
      message: "Your inquiry for an independent CPA or Enrolled Agent has been safely submitted.",
      actionUrl: "/dashboard",
      actionLabel: "View Dashboard",
      idempotencyKey: `pro_handoff_${leadId}`,
      emailRecipient: email,
      emailSubject: tpl.subject,
      emailText: tpl.text,
      emailHtml: tpl.html,
      metadata: { leadId },
    });
  }

  /**
   * Dispatches security alert (e.g. password changed).
   * Security notifications are permanent and cannot be opted out of.
   */
  public static async notifyPasswordChanged(
    userId: string,
    email?: string
  ): Promise<DispatchResult> {
    const config = getEmailConfig();
    const tpl = NotificationTemplates.passwordChanged({
      siteUrl: config.siteUrl,
    });

    return this.dispatch({
      userId,
      category: "authentication",
      type: "password_changed",
      title: "Password Changed",
      message: "The password for your TaxAIHelp account was recently changed.",
      actionUrl: "/dashboard/settings",
      actionLabel: "Review Security",
      emailRecipient: email,
      emailSubject: tpl.subject,
      emailText: tpl.text,
      emailHtml: tpl.html,
    });
  }

  /**
   * Internal Admin Notification (isolated from standard user inboxes).
   */
  public static async notifyAdmin(
    adminUserId: string,
    title: string,
    message: string,
    metadata?: Record<string, string | number | boolean>
  ): Promise<DispatchResult> {
    return this.dispatch({
      userId: adminUserId,
      category: "system",
      type: "important_service_notice",
      title,
      message,
      isAdminOnly: true, // Guarantees standard user endpoints ignore this
      actionUrl: "/admin",
      actionLabel: "Admin Portal",
      metadata,
    });
  }

  /**
   * Resets global tracking for test teardown.
   */
  public static clear(): void {
    getDeletedUserSet().clear();
    NotificationStore.clear();
    NotificationPreferencesStore.clear();
  }
}
