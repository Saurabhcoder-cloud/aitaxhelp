/**
 * Centralized Typed Notification Model (Phase 5 Step 13)
 * Provides comprehensive category, event, delivery, template, and preference definitions.
 */

export type NotificationCategory =
  | "authentication"
  | "calculations"
  | "ai"
  | "billing"
  | "professional"
  | "system"
  | "support";

export type NotificationType =
  // Authentication & Security
  | "account_created"
  | "email_verification"
  | "password_reset_requested"
  | "password_changed"
  | "security_event"
  | "account_deleted"
  // Calculations & Reports
  | "calculation_saved"
  | "report_ready"
  // AI Assistant Quota
  | "ai_usage_limit_warning"
  | "ai_daily_limit_reached"
  // Monetization & Billing
  | "subscription_started"
  | "subscription_changed"
  | "subscription_cancelled"
  | "payment_required"
  | "payment_failed"
  | "renewal_reminder"
  // Professional CPA/EA Handoff
  | "professional_handoff_submitted"
  | "professional_handoff_status_changed"
  // Support Center (Phase 5 Step 16)
  | "support_ticket_created"
  | "support_ticket_reply"
  | "support_ticket_status_changed"
  | "support_ticket_resolved"
  // System Notices
  | "important_service_notice"
  | "privacy_policy_updated"
  | "terms_updated";

export type DeliveryChannel = "in_app" | "email";

export type DeliveryStatus =
  | "sent"
  | "provider_unconfigured"
  | "failed"
  | "skipped";

/**
 * In-App Notification representation for user notification center.
 */
export interface InAppNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  readAt?: string;
  // Admin isolation flag: true if only visible to verified administrators
  isAdminOnly?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * User-configurable communication preferences.
 * CRITICAL SECURITY INVARIANT:
 * securityEnabled and accountEnabled are permanently locked to true and cannot be disabled.
 */
export interface NotificationPreferences {
  userId: string;
  securityEnabled: boolean; // Immutable true
  accountEnabled: boolean; // Immutable true
  taxReportsEnabled: boolean; // Default true
  calculationsEnabled: boolean; // Default true
  aiUsageEnabled: boolean; // Default true
  billingEnabled: boolean; // Default true
  professionalHandoffEnabled: boolean; // Default true
  productUpdatesEnabled: boolean; // Default false (opt-in)
  marketingEnabled: boolean; // Default false (opt-in)
  updatedAt: string;
}

/**
 * Standard Email Message specification.
 */
export interface EmailMessage {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  category?: NotificationCategory;
  unsubscribeUrl?: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Delivery result emitted by EmailProvider abstraction.
 */
export interface EmailDeliveryResult {
  success: boolean;
  status: DeliveryStatus;
  provider: string;
  messageId?: string;
  error?: string;
  timestamp: string;
}

/**
 * Pluggable Email Provider Interface.
 */
export interface EmailProvider {
  readonly name: string;
  sendEmail(message: EmailMessage): Promise<EmailDeliveryResult>;
  sendTemplate(
    templateId: string,
    to: string,
    variables: Record<string, string>
  ): Promise<EmailDeliveryResult>;
  healthCheck(): Promise<{ ok: boolean; provider: string; details?: string }>;
}

/**
 * Immutable Notification Delivery Audit Record.
 * CRITICAL PRIVACY INVARIANT:
 * Zero full message bodies containing sensitive tax details or reset tokens are stored.
 */
export interface NotificationDeliveryRecord {
  id: string;
  userId: string;
  notificationType: NotificationType;
  channel: DeliveryChannel;
  provider: string;
  status: DeliveryStatus;
  idempotencyKey?: string;
  recipientSanitized: string;
  failureCode?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
  sentAt?: string;
}
