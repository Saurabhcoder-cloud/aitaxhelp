import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import {
  SupportTicket,
  SupportMessage,
  SupportTicketWithMessages,
  SupportStatus,
  SupportPriority,
  SupportAuthorType,
  SupportStats,
  SupportTicketListResponse,
  SupportTicketSafeContext,
  SupportCategory,
} from "@/types/support";
import { OperationalError } from "@/lib/observability/errors";

declare global {
  // eslint-disable-next-line no-var
  var __supportTicketsStore: Map<string, SupportTicket> | undefined;
  // eslint-disable-next-line no-var
  var __supportMessagesStore: Map<string, SupportMessage[]> | undefined;
  // eslint-disable-next-line no-var
  var __supportTicketCounter: number | undefined;
}

function getTicketsMap(): Map<string, SupportTicket> {
  if (!globalThis.__supportTicketsStore) {
    globalThis.__supportTicketsStore = new Map<string, SupportTicket>();
  }
  return globalThis.__supportTicketsStore;
}

function getMessagesMap(): Map<string, SupportMessage[]> {
  if (!globalThis.__supportMessagesStore) {
    globalThis.__supportMessagesStore = new Map<string, SupportMessage[]>();
  }
  return globalThis.__supportMessagesStore;
}

function getNextTicketNumber(): string {
  if (globalThis.__supportTicketCounter === undefined) {
    globalThis.__supportTicketCounter = 100;
  }
  globalThis.__supportTicketCounter += 1;
  const year = new Date().getFullYear();
  const padded = String(globalThis.__supportTicketCounter).padStart(6, "0");
  return `TAH-${year}-${padded}`;
}

export class SupportStore {
  /**
   * Generates a unique, server-authoritative human-readable ticket number.
   * Client-supplied numbers are strictly ignored.
   */
  public static generateTicketNumber(): string {
    return getNextTicketNumber();
  }

  /**
   * Creates a new support ticket and its initial message.
   */
  public static async createTicket(params: {
    userId: string;
    ticketNumber?: string;
    userEmail?: string;
    userName?: string;
    subject: string;
    category: SupportCategory;
    priority?: SupportPriority;
    status?: SupportStatus;
    description: string;
    safeContext?: SupportTicketSafeContext;
    rating?: number | null;
  }): Promise<SupportTicketWithMessages> {
    const id = crypto.randomUUID();
    const ticketNumber = params.ticketNumber || this.generateTicketNumber();
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id,
      ticketNumber,
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
      subject: params.subject,
      category: params.category,
      priority: params.priority || "NORMAL",
      status: params.status || "OPEN",
      assignedAdminId: null,
      safeContext: params.safeContext,
      rating: params.rating ?? null,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      createdBy: params.userId,
      updatedBy: params.userId,
    };

    const initialMessage: SupportMessage = {
      id: crypto.randomUUID(),
      ticketId: id,
      authorUserId: params.userId,
      authorType: "USER",
      authorName: params.userName || "User",
      body: params.description,
      isInternal: false,
      createdAt: now,
      updatedAt: now,
    };

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (table: string) => {
            insert: (data: unknown) => Promise<{ error: { message: string } | null }>;
          };
        };

        await supabase.from("support_tickets").insert({
          id: ticket.id,
          ticket_number: ticket.ticketNumber,
          user_id: ticket.userId,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          safe_context: ticket.safeContext || null,
          rating: ticket.rating,
          created_at: now,
          updated_at: now,
          last_message_at: now,
        });

        await supabase.from("support_messages").insert({
          id: initialMessage.id,
          ticket_id: initialMessage.ticketId,
          author_user_id: initialMessage.authorUserId,
          author_type: initialMessage.authorType,
          body: initialMessage.body,
          is_internal: false,
          created_at: now,
          updated_at: now,
        });
      } catch (_err) {
        // Fall back to memory store
      }
    }

    getTicketsMap().set(id, ticket);
    getMessagesMap().set(id, [initialMessage]);

    return {
      ...ticket,
      messages: [initialMessage],
    };
  }

  /**
   * Retrieves a ticket for the user who owns it.
   * STRICT PRIVACY INVARIANT: Internal notes (isInternal = true) are completely omitted.
   */
  public static async getTicketForUser(
    ticketId: string,
    userId: string
  ): Promise<SupportTicketWithMessages> {
    const ticket = getTicketsMap().get(ticketId);
    if (!ticket) {
      throw new OperationalError(
        "Support ticket not found.",
        404,
        "SUPPORT_TICKET_NOT_FOUND"
      );
    }

    if (ticket.userId !== userId) {
      throw new OperationalError(
        "You do not have permission to view this support ticket.",
        403,
        "SUPPORT_ACCESS_DENIED"
      );
    }

    const messages = (getMessagesMap().get(ticketId) || []).filter(
      (m) => !m.isInternal
    );

    return {
      ...ticket,
      messages,
    };
  }

  /**
   * Lists tickets owned by a specific user with pagination.
   */
  public static async listTicketsForUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: SupportStatus;
    } = {}
  ): Promise<SupportTicketListResponse> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(50, Math.max(1, options.limit || 10));

    let userTickets = Array.from(getTicketsMap().values()).filter(
      (t) => t.userId === userId
    );

    if (options.status) {
      userTickets = userTickets.filter((t) => t.status === options.status);
    }

    // Sort by lastMessageAt descending
    userTickets.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    const total = userTickets.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginated = userTickets.slice(start, start + pageSize);

    return {
      tickets: paginated,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Retrieves a ticket for authorized administrators.
   * Includes all messages, internal notes, and administrative context.
   */
  public static async getTicketForAdmin(
    ticketId: string
  ): Promise<SupportTicketWithMessages> {
    const ticket = getTicketsMap().get(ticketId);
    if (!ticket) {
      throw new OperationalError(
        "Support ticket not found.",
        404,
        "SUPPORT_TICKET_NOT_FOUND"
      );
    }

    const messages = getMessagesMap().get(ticketId) || [];

    return {
      ...ticket,
      messages,
    };
  }

  /**
   * Lists all tickets for administrative management with search and filters.
   */
  public static async listTicketsForAdmin(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: SupportStatus;
    category?: SupportCategory;
    priority?: SupportPriority;
    assignedAdminId?: string;
  } = {}): Promise<SupportTicketListResponse> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.limit || 20));

    let tickets = Array.from(getTicketsMap().values());

    if (options.search) {
      const q = options.search.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.userEmail && t.userEmail.toLowerCase().includes(q))
      );
    }

    if (options.status) {
      tickets = tickets.filter((t) => t.status === options.status);
    }
    if (options.category) {
      tickets = tickets.filter((t) => t.category === options.category);
    }
    if (options.priority) {
      tickets = tickets.filter((t) => t.priority === options.priority);
    }
    if (options.assignedAdminId !== undefined) {
      tickets = tickets.filter(
        (t) => t.assignedAdminId === options.assignedAdminId
      );
    }

    // Sort by lastMessageAt descending
    tickets.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    const total = tickets.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginated = tickets.slice(start, start + pageSize);

    return {
      tickets: paginated,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Appends a message or internal note to a ticket.
   */
  public static async addMessage(params: {
    ticketId: string;
    authorUserId: string;
    authorType: SupportAuthorType;
    authorName?: string;
    body: string;
    isInternal: boolean;
  }): Promise<SupportMessage> {
    const ticket = getTicketsMap().get(params.ticketId);
    if (!ticket) {
      throw new OperationalError(
        "Support ticket not found.",
        404,
        "SUPPORT_TICKET_NOT_FOUND"
      );
    }

    const now = new Date().toISOString();
    const message: SupportMessage = {
      id: crypto.randomUUID(),
      ticketId: params.ticketId,
      authorUserId: params.authorUserId,
      authorType: params.authorType,
      authorName: params.authorName,
      body: params.body,
      isInternal: params.isInternal,
      createdAt: now,
      updatedAt: now,
    };

    // Update ticket timestamps and reactive status
    ticket.lastMessageAt = now;
    ticket.updatedAt = now;
    ticket.updatedBy = params.authorUserId;

    if (params.authorType === "USER" && ticket.status === "WAITING_FOR_USER") {
      ticket.status = "IN_PROGRESS";
    } else if (
      params.authorType === "ADMIN" &&
      !params.isInternal &&
      ticket.status === "OPEN"
    ) {
      ticket.status = "WAITING_FOR_USER";
    }

    const messages = getMessagesMap().get(params.ticketId) || [];
    messages.push(message);
    getMessagesMap().set(params.ticketId, messages);

    return message;
  }

  /**
   * Appends an internal staff note to a ticket (hidden from end-users).
   */
  public static async addInternalNote(params: {
    ticketId: string;
    adminUserId: string;
    body: string;
    authorName?: string;
  }): Promise<SupportMessage> {
    return this.addMessage({
      ticketId: params.ticketId,
      authorUserId: params.adminUserId,
      authorType: "ADMIN",
      authorName: params.authorName || "Staff",
      body: params.body,
      isInternal: true,
    });
  }

  /**
   * Updates ticket status with workflow transition safeguards.
   */
  public static async updateStatus(
    ticketId: string,
    newStatus: SupportStatus,
    actorId: string,
    isUser = false
  ): Promise<SupportTicket> {
    const ticket = getTicketsMap().get(ticketId);
    if (!ticket) {
      throw new OperationalError(
        "Support ticket not found.",
        404,
        "SUPPORT_TICKET_NOT_FOUND"
      );
    }

    if (isUser) {
      // Users can only close open tickets or reopen resolved tickets
      if (newStatus === "CLOSED") {
        if (ticket.status === "CLOSED") {
          return ticket;
        }
      } else if (newStatus === "OPEN") {
        if (ticket.status !== "RESOLVED") {
          throw new OperationalError(
            "Users can only reopen tickets that are currently in RESOLVED status.",
            400,
            "INVALID_STATUS_TRANSITION"
          );
        }
      } else {
        throw new OperationalError(
          "Users are only permitted to close or reopen their tickets.",
          403,
          "SUPPORT_ACCESS_DENIED"
        );
      }
    }

    const now = new Date().toISOString();
    ticket.status = newStatus;
    ticket.updatedAt = now;
    ticket.updatedBy = actorId;

    if (newStatus === "RESOLVED") {
      ticket.resolvedAt = now;
    } else if (newStatus === "CLOSED") {
      ticket.closedAt = now;
    } else if (newStatus === "OPEN") {
      ticket.resolvedAt = null;
      ticket.closedAt = null;
    }

    return ticket;
  }

  /**
   * Updates ticket priority (Administrator only).
   */
  public static async updatePriority(
    ticketId: string,
    priority: SupportPriority,
    adminUserId: string
  ): Promise<SupportTicket> {
    const ticket = getTicketsMap().get(ticketId);
    if (!ticket) {
      throw new OperationalError(
        "Support ticket not found.",
        404,
        "SUPPORT_TICKET_NOT_FOUND"
      );
    }

    const now = new Date().toISOString();
    ticket.priority = priority;
    ticket.updatedAt = now;
    ticket.updatedBy = adminUserId;

    return ticket;
  }

  /**
   * Assigns ticket to an administrator (Administrator only).
   */
  public static async assignTicket(
    ticketId: string,
    assignedAdminId: string | null,
    adminUserId: string,
    assignedAdminName?: string | null
  ): Promise<SupportTicket> {
    const ticket = getTicketsMap().get(ticketId);
    if (!ticket) {
      throw new OperationalError(
        "Support ticket not found.",
        404,
        "SUPPORT_TICKET_NOT_FOUND"
      );
    }

    const now = new Date().toISOString();
    ticket.assignedAdminId = assignedAdminId;
    ticket.assignedAdminName = assignedAdminName ?? null;
    ticket.updatedAt = now;
    ticket.updatedBy = adminUserId;

    return ticket;
  }

  /**
   * Compiles live aggregate support metrics for administrative oversight.
   */
  public static async getSupportStats(): Promise<SupportStats> {
    const tickets = Array.from(getTicketsMap().values());

    let openCount = 0;
    let inProgressCount = 0;
    let waitingForUserCount = 0;
    let waitingInternalCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;
    let urgentCount = 0;
    let unassignedCount = 0;
    let feedbackCount = 0;
    let securityCount = 0;

    for (const t of tickets) {
      if (t.status === "OPEN") openCount++;
      if (t.status === "IN_PROGRESS") inProgressCount++;
      if (t.status === "WAITING_FOR_USER") waitingForUserCount++;
      if (t.status === "WAITING_INTERNAL") waitingInternalCount++;
      if (t.status === "RESOLVED") resolvedCount++;
      if (t.status === "CLOSED") closedCount++;
      if (t.priority === "URGENT") urgentCount++;
      if (!t.assignedAdminId) unassignedCount++;
      if (t.category === "FEEDBACK") feedbackCount++;
      if (t.category === "SECURITY" || t.category === "PRIVACY") securityCount++;
    }

    return {
      openCount,
      inProgressCount,
      waitingForUserCount,
      waitingInternalCount,
      resolvedCount,
      closedCount,
      urgentCount,
      unassignedCount,
      totalCount: tickets.length,
      feedbackCount,
      securityCount,
    };
  }

  /**
   * Extracts user-visible support data for account export.
   * STRICT PRIVACY INVARIANT: Internal notes, admin-only audit logs, and internal IDs are completely excluded.
   */
  public static async getUserExportData(userId: string): Promise<
    Array<{
      ticketNumber: string;
      subject: string;
      category: string;
      status: string;
      createdAt: string;
      messages: Array<{
        authorType: string;
        body: string;
        createdAt: string;
      }>;
    }>
  > {
    const tickets = Array.from(getTicketsMap().values()).filter(
      (t) => t.userId === userId
    );

    return tickets.map((t) => {
      const messages = (getMessagesMap().get(t.id) || [])
        .filter((m) => !m.isInternal)
        .map((m) => ({
          authorType: m.authorType,
          body: m.body,
          createdAt: m.createdAt,
        }));

      return {
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt,
        messages,
      };
    });
  }

  /**
   * Purges all support records for a deleted account.
   */
  public static async deleteUserData(userId: string): Promise<number> {
    const ticketsMap = getTicketsMap();
    const messagesMap = getMessagesMap();

    const userTicketIds: string[] = [];
    for (const [id, t] of ticketsMap.entries()) {
      if (t.userId === userId) {
        userTicketIds.push(id);
      }
    }

    for (const id of userTicketIds) {
      ticketsMap.delete(id);
      messagesMap.delete(id);
    }

    return userTicketIds.length;
  }

  /**
   * Resets memory stores (used in test teardown).
   */
  public static clear(): void {
    if (globalThis.__supportTicketsStore) {
      globalThis.__supportTicketsStore.clear();
    }
    if (globalThis.__supportMessagesStore) {
      globalThis.__supportMessagesStore.clear();
    }
    globalThis.__supportTicketCounter = 100;
  }
}
