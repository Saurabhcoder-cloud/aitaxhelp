import {
  SupportTicket,
  SupportMessage,
  SupportTicketWithMessages,
  SupportCategory,
  SupportPriority,
  SupportStatus,
  SupportStats,
  SupportTicketListResponse,
  SupportTicketSafeContext,
} from "@/types/support";
import { SupportStore } from "./support-store";
import { FeatureFlags } from "./feature-flags";
import { NotificationService } from "@/lib/notifications/service";
import { NotificationTemplates } from "@/lib/notifications/templates";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { RateLimiter } from "@/lib/utils/rate-limiter";
import { sanitizeSupportText } from "@/lib/validations/support";
import { OperationalError } from "@/lib/observability/errors";
import { Logger } from "@/lib/observability/logger";
import { Metrics } from "@/lib/observability/metrics";

const ticketRateLimiter = new RateLimiter();
const messageRateLimiter = new RateLimiter();

export class SupportService {
  /**
   * Submits a new support ticket.
   *
   * SECURITY & PRIVACY INVARIANTS:
   * 1. Enforces support.enabled feature flag (SECURITY/PRIVACY categories bypass lockdown).
   * 2. Sliding window rate limiting prevents ticket flooding.
   * 3. Sanitizes all user-supplied text to prevent XSS.
   * 4. Safe context stores only metadata references; never financial numbers.
   */
  public static async createTicket(params: {
    userId: string;
    userEmail?: string;
    userName?: string;
    subject: string;
    category: SupportCategory;
    priority?: SupportPriority;
    description: string;
    safeContext?: SupportTicketSafeContext;
    rating?: number | null;
    requestId?: string;
  }): Promise<SupportTicketWithMessages> {
    const isSecurityOrPrivacy =
      params.category === "SECURITY" || params.category === "PRIVACY";

    // Feature Flag Check
    const supportEnabled = await FeatureFlags.isSupportEnabled();
    if (!supportEnabled && !isSecurityOrPrivacy) {
      Metrics.increment("support_operation_blocked_total", 1, {
        reason: "feature_disabled",
      });
      throw new OperationalError(
        "The Support Center is temporarily undergoing scheduled maintenance. Please try again shortly.",
        503,
        "FEATURE_DISABLED"
      );
    }

    // Rate Limiting (5 tickets per 15 minutes)
    const rateCheck = ticketRateLimiter.check(params.userId, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      Metrics.increment("support_rate_limit_triggered", 1, {
        userId: params.userId,
      });
      throw new OperationalError(
        "Too many support requests submitted. Please wait a few minutes before submitting another request.",
        429,
        "RATE_LIMIT_ERROR"
      );
    }

    const cleanSubject = sanitizeSupportText(params.subject);
    const cleanDescription = sanitizeSupportText(params.description);

    // Priority rule: User-created tickets default to NORMAL and cannot arbitrarily set URGENT.
    // SECURITY and PRIVACY automatically escalate to at least HIGH.
    let priority: SupportPriority = params.priority || "NORMAL";
    if (!isSecurityOrPrivacy && priority === "URGENT") {
      priority = "NORMAL";
    }
    if (isSecurityOrPrivacy && (priority === "NORMAL" || priority === "LOW")) {
      priority = "HIGH";
    }

    const ticket = await SupportStore.createTicket({
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
      subject: cleanSubject,
      category: params.category,
      priority,
      description: cleanDescription,
      safeContext: params.safeContext,
      rating: params.rating,
    });

    Metrics.increment("support_ticket_created_total", 1, {
      category: ticket.category,
      priority: ticket.priority,
    });

    Logger.info("support:ticket_created", "Support ticket created successfully", {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      category: ticket.category,
      priority: ticket.priority,
      requestId: params.requestId,
    });

    // In-App Notification confirmation to user
    try {
      await NotificationService.dispatchNotification({
        userId: params.userId,
        category: "support",
        type: "support_ticket_created",
        title: `Support Ticket Received: ${ticket.ticketNumber}`,
        message: `Your support request "${ticket.subject}" has been received. Our team will review it shortly.`,
        actionUrl: `/dashboard/support/${ticket.id}`,
        actionLabel: "View Ticket",
        idempotencyKey: `support_create_${ticket.id}`,
      });
    } catch (_err) {
      // Non-blocking notification dispatch
    }

    return ticket;
  }

  /**
   * Adds a user reply to an existing ticket.
   */
  public static async addUserReply(params: {
    ticketId: string;
    userId: string;
    userName?: string;
    body: string;
    requestId?: string;
  }): Promise<SupportMessage> {
    // Verify ownership first
    const ticket = await SupportStore.getTicketForUser(params.ticketId, params.userId);

    // Rate Limiting (15 messages per 10 minutes)
    const rateCheck = messageRateLimiter.check(params.userId, 15, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      Metrics.increment("support_rate_limit_triggered", 1, {
        userId: params.userId,
      });
      throw new OperationalError(
        "Too many messages sent. Please wait a moment before replying.",
        429,
        "RATE_LIMIT_ERROR"
      );
    }

    const cleanBody = sanitizeSupportText(params.body);

    const message = await SupportStore.addMessage({
      ticketId: params.ticketId,
      authorUserId: params.userId,
      authorType: "USER",
      authorName: params.userName || "User",
      body: cleanBody,
      isInternal: false,
    });

    Metrics.increment("support_message_created_total", 1, { authorType: "USER" });

    Logger.info("support:message_created", "User reply added to support ticket", {
      ticketId: params.ticketId,
      ticketNumber: ticket.ticketNumber,
      authorType: "USER",
      requestId: params.requestId,
    });

    return message;
  }

  /**
   * Adds an administrator public reply.
   */
  public static async addAdminReply(params: {
    ticketId: string;
    adminUserId: string;
    adminName?: string;
    body: string;
    requestId?: string;
  }): Promise<SupportMessage> {
    const cleanBody = sanitizeSupportText(params.body);

    const message = await SupportStore.addMessage({
      ticketId: params.ticketId,
      authorUserId: params.adminUserId,
      authorType: "ADMIN",
      authorName: params.adminName || "Support Team",
      body: cleanBody,
      isInternal: false,
    });

    const ticket = await SupportStore.getTicketForAdmin(params.ticketId);

    Metrics.increment("support_message_created_total", 1, { authorType: "ADMIN" });

    // Audit log
    await AuditLogStore.log({
      adminUserId: params.adminUserId,
      action: "support_admin_reply",
      targetType: "support_ticket",
      targetId: params.ticketId,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        requestId: params.requestId,
      },
    });

    // Notify ticket owner
    try {
      const excerpt =
        cleanBody.length > 100 ? `${cleanBody.substring(0, 100)}...` : cleanBody;

      const template = NotificationTemplates.supportTicketReply({
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        ticketId: ticket.id,
        replyExcerpt: excerpt,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://taxaihelp.com",
      });

      await NotificationService.dispatchNotification({
        userId: ticket.userId,
        category: "support",
        type: "support_ticket_reply",
        title: `New Reply on Ticket ${ticket.ticketNumber}`,
        message: `Our team has posted a reply: "${excerpt}"`,
        actionUrl: `/dashboard/support/${ticket.id}`,
        actionLabel: "View Ticket & Reply",
        emailRecipient: ticket.userEmail,
        emailSubject: template.subject,
        emailText: template.text,
        emailHtml: template.html,
        idempotencyKey: `reply_notif_${message.id}`,
      });
    } catch (_err) {
      // Non-blocking notification dispatch
    }

    return message;
  }

  /**
   * Adds an administrator private internal note.
   * STRICT PRIVACY INVARIANT: Internal notes are never notified or displayed to ticket owners.
   */
  public static async addInternalNote(params: {
    ticketId: string;
    adminUserId: string;
    adminName?: string;
    body: string;
    requestId?: string;
  }): Promise<SupportMessage> {
    const cleanBody = sanitizeSupportText(params.body);

    const message = await SupportStore.addMessage({
      ticketId: params.ticketId,
      authorUserId: params.adminUserId,
      authorType: "ADMIN",
      authorName: params.adminName || "Internal Note",
      body: cleanBody,
      isInternal: true,
    });

    const ticket = await SupportStore.getTicketForAdmin(params.ticketId);

    // Audit log (never records message body)
    await AuditLogStore.log({
      adminUserId: params.adminUserId,
      action: "support_internal_note_added",
      targetType: "support_ticket",
      targetId: params.ticketId,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        requestId: params.requestId,
      },
    });

    return message;
  }

  /**
   * Updates ticket status (User close/reopen or Admin management).
   */
  public static async updateStatus(params: {
    ticketId: string;
    status: SupportStatus;
    actorUserId: string;
    isUser: boolean;
    requestId?: string;
  }): Promise<SupportTicket> {
    const ticket = await SupportStore.updateStatus(
      params.ticketId,
      params.status,
      params.actorUserId,
      params.isUser
    );

    const action =
      params.status === "RESOLVED"
        ? "support_ticket_resolved"
        : params.status === "OPEN" && params.isUser
        ? "support_ticket_reopened"
        : "support_ticket_status_changed";

    if (!params.isUser) {
      await AuditLogStore.log({
        adminUserId: params.actorUserId,
        action,
        targetType: "support_ticket",
        targetId: params.ticketId,
        metadata: {
          newStatus: params.status,
          ticketNumber: ticket.ticketNumber,
          requestId: params.requestId,
        },
      });
    }

    if (params.status === "RESOLVED") {
      Metrics.increment("support_ticket_resolved_total", 1);
      // Notify user of resolution
      try {
        await NotificationService.dispatchNotification({
          userId: ticket.userId,
          category: "support",
          type: "support_ticket_resolved",
          title: `Ticket Resolved: ${ticket.ticketNumber}`,
          message: `Your support request "${ticket.subject}" has been marked as resolved.`,
          actionUrl: `/dashboard/support/${ticket.id}`,
          actionLabel: "View Ticket",
        });
      } catch (_err) {}
    } else if (params.status === "OPEN" && params.isUser) {
      Metrics.increment("support_ticket_reopened_total", 1);
    } else if (!params.isUser) {
      // Notify user of administrative status transition
      try {
        await NotificationService.dispatchNotification({
          userId: ticket.userId,
          category: "support",
          type: "support_ticket_status_changed",
          title: `Ticket Status Updated: ${ticket.ticketNumber}`,
          message: `Your support request "${ticket.subject}" has been updated to ${params.status}.`,
          actionUrl: `/dashboard/support/${ticket.id}`,
          actionLabel: "View Ticket",
        });
      } catch (_err) {}
    }

    return ticket;
  }

  /**
   * Updates ticket priority (Administrator only).
   */
  public static async updatePriority(params: {
    ticketId: string;
    priority: SupportPriority;
    adminUserId: string;
    requestId?: string;
  }): Promise<SupportTicket> {
    const ticket = await SupportStore.updatePriority(
      params.ticketId,
      params.priority,
      params.adminUserId
    );

    await AuditLogStore.log({
      adminUserId: params.adminUserId,
      action: "support_ticket_priority_changed",
      targetType: "support_ticket",
      targetId: params.ticketId,
      metadata: {
        newPriority: params.priority,
        ticketNumber: ticket.ticketNumber,
        requestId: params.requestId,
      },
    });

    return ticket;
  }

  /**
   * Assigns ticket to an administrator.
   */
  public static async assignTicket(params: {
    ticketId: string;
    assignedAdminId: string | null;
    adminUserId: string;
    assignedAdminName?: string | null;
    requestId?: string;
  }): Promise<SupportTicket> {
    const ticket = await SupportStore.assignTicket(
      params.ticketId,
      params.assignedAdminId,
      params.adminUserId,
      params.assignedAdminName
    );

    await AuditLogStore.log({
      adminUserId: params.adminUserId,
      action: "support_ticket_assigned",
      targetType: "support_ticket",
      targetId: params.ticketId,
      metadata: {
        assignedAdminId: params.assignedAdminId || "unassigned",
        ticketNumber: ticket.ticketNumber,
        requestId: params.requestId,
      },
    });

    return ticket;
  }

  /**
   * Retrieves user-facing ticket details.
   */
  public static async getTicketForUser(
    ticketId: string,
    userId: string
  ): Promise<SupportTicketWithMessages> {
    return SupportStore.getTicketForUser(ticketId, userId);
  }

  /**
   * Lists tickets for user dashboard.
   */
  public static async listTicketsForUser(
    userId: string,
    options: { page?: number; limit?: number; status?: SupportStatus } = {}
  ): Promise<SupportTicketListResponse> {
    return SupportStore.listTicketsForUser(userId, options);
  }

  /**
   * Retrieves ticket details for administrative dashboard.
   */
  public static async getTicketForAdmin(
    ticketId: string
  ): Promise<SupportTicketWithMessages> {
    return SupportStore.getTicketForAdmin(ticketId);
  }

  /**
   * Lists tickets for administrative queue with filters and search.
   */
  public static async listTicketsForAdmin(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: SupportStatus;
      category?: SupportCategory;
      priority?: SupportPriority;
      assignedAdminId?: string;
    } = {}
  ): Promise<SupportTicketListResponse> {
    return SupportStore.listTicketsForAdmin(options);
  }

  /**
   * Compiles live support analytics for administrative overview.
   */
  public static async getSupportStats(): Promise<SupportStats> {
    return SupportStore.getSupportStats();
  }
}
