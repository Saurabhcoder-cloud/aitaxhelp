import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as getUserTicketsApi,
  POST as postUserTicketApi,
} from "../app/api/v1/support/tickets/route";
import {
  GET as getUserTicketDetailApi,
  PATCH as patchUserTicketApi,
} from "../app/api/v1/support/tickets/[id]/route";
import { POST as postUserMessageApi } from "../app/api/v1/support/tickets/[id]/messages/route";
import { GET as getAdminTicketsApi } from "../app/api/v1/admin/support/route";
import {
  GET as getAdminTicketDetailApi,
  PATCH as patchAdminTicketApi,
} from "../app/api/v1/admin/support/[id]/route";
import { POST as postAdminReplyApi } from "../app/api/v1/admin/support/[id]/reply/route";
import { POST as postAdminInternalNoteApi } from "../app/api/v1/admin/support/[id]/internal-note/route";
import { POST as postAdminAssignApi } from "../app/api/v1/admin/support/[id]/assign/route";
import { POST as postAdminStatusApi } from "../app/api/v1/admin/support/[id]/status/route";
import { GET as getAdminStatsApi } from "../app/api/v1/admin/support/stats/route";

import { SupportStore } from "../lib/services/support-store";
import { SupportService } from "../lib/services/support-service";
import { PlatformConfigStore } from "../lib/config/platform-config-store";
import { AuditLogStore } from "../lib/services/audit-log-store";
import { NotificationStore } from "../lib/notifications/store";
import { NotificationTemplates } from "../lib/notifications/templates";
import { AccountDataService } from "../lib/services/account-data";
import {
  createSupportTicketSchema,
  addSupportMessageSchema,
  adminInternalNoteSchema,
  adminUpdateStatusSchema,
  adminUpdatePrioritySchema,
  sanitizeSupportText,
  supportSearchFilterSchema,
} from "../lib/validations/support";
import { OperationalError } from "../lib/observability/errors";
import { RateLimiter } from "../lib/utils/rate-limiter";

function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    cookie?: string;
    headers?: Record<string, string>;
  } = {}
) {
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (options.token) {
    reqHeaders["Authorization"] = `Bearer ${options.token}`;
  }
  if (options.cookie) {
    reqHeaders["Cookie"] = `taxaihelp-auth-token=${options.cookie}`;
  }

  const body =
    options.body !== undefined
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : undefined;

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers: reqHeaders,
    body,
  });
}

describe("Phase 5 Step 16: Production Support Center, User Feedback & Admin Management", () => {
  beforeEach(() => {
    SupportStore.clear();
    PlatformConfigStore.clear();
    AuditLogStore.clear();
    NotificationStore.clear();
    RateLimiter.clear();
  });

  // 1. authenticated user can create ticket
  it("1. authenticated user can create ticket", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      method: "POST",
      token: "test-user-1",
      body: {
        subject: "Need help with self-employed quarterly taxes",
        category: "TAX_CALCULATION",
        description: "I need clarification on the calculation of line 12 deductions.",
      },
    });

    const res = await postUserTicketApi(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.ticketNumber).toMatch(/^TAH-\d{4}-\d{6}$/);
    expect(json.data.subject).toBe("Need help with self-employed quarterly taxes");
    expect(json.data.category).toBe("TAX_CALCULATION");
    expect(json.data.status).toBe("OPEN");
    expect(json.data.priority).toBe("NORMAL");
    expect(json.data.messages.length).toBe(1);
    expect(json.data.messages[0].authorType).toBe("USER");
  });

  // 2. unauthenticated user cannot create ticket
  it("2. unauthenticated user cannot create ticket", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      method: "POST",
      body: {
        subject: "Unauthenticated request attempt",
        category: "ACCOUNT",
        description: "This should fail because no session token is provided.",
      },
    });

    const res = await postUserTicketApi(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  // 3. user can list own tickets
  it("3. user can list own tickets", async () => {
    await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "User 1 Ticket A",
      category: "ACCOUNT",
      description: "My first ticket",
    });
    await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "User 1 Ticket B",
      category: "BILLING",
      description: "My second ticket",
    });

    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      token: "test-user-1",
    });

    const res = await getUserTicketsApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.tickets.length).toBe(2);
    expect(json.data.total).toBe(2);
  });

  // 4. user cannot list another user's tickets
  it("4. user cannot list another user's tickets", async () => {
    await SupportStore.createTicket({
      userId: "test-user-2",
      subject: "Private ticket of user 2",
      category: "BILLING",
      description: "Confidential billing question",
    });

    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      token: "test-user-1",
    });

    const res = await getUserTicketsApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.tickets.length).toBe(0);
    expect(json.data.total).toBe(0);
  });

  // 5. user can view own ticket
  it("5. user can view own ticket", async () => {
    const created = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Ticket for detail viewing",
      category: "CALCULATOR",
      description: "Detail test description",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/support/tickets/${created.id}`,
      { token: "test-user-1" }
    );

    const res = await getUserTicketDetailApi(req, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(created.id);
    expect(json.data.subject).toBe("Ticket for detail viewing");
  });

  // 6. user cannot view another user's ticket
  it("6. user cannot view another user's ticket", async () => {
    const created = await SupportStore.createTicket({
      userId: "test-user-other",
      subject: "Another user's private ticket",
      category: "ACCOUNT",
      description: "Private information",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/support/tickets/${created.id}`,
      { token: "test-user-1" }
    );

    const res = await getUserTicketDetailApi(req, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  // 7. user can reply to own ticket
  it("7. user can reply to own ticket", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Ticket awaiting user follow-up",
      category: "ACCOUNT",
      description: "Initial message",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/support/tickets/${ticket.id}/messages`,
      {
        method: "POST",
        token: "test-user-1",
        body: { body: "Here is the extra context requested." },
      }
    );

    const res = await postUserMessageApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.body).toBe("Here is the extra context requested.");
    expect(json.data.authorType).toBe("USER");
    expect(json.data.isInternal).toBe(false);
  });

  // 8. user cannot create internal note
  it("8. user cannot create internal note", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Test ticket",
      category: "BUG",
      description: "Description",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}/internal-note`,
      {
        method: "POST",
        token: "test-user-1", // Non-admin user!
        body: { body: "Sneaky internal note attempt" },
      }
    );

    const res = await postAdminInternalNoteApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(403);
  });

  // 9. user cannot create admin message
  it("9. user cannot create admin message", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Test ticket",
      category: "BUG",
      description: "Description",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}/reply`,
      {
        method: "POST",
        token: "test-user-1", // Non-admin user!
        body: { body: "Impersonated admin message" },
      }
    );

    const res = await postAdminReplyApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(403);
  });

  // 10. admin can list tickets
  it("10. admin can list tickets", async () => {
    await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Ticket from User 1",
      category: "BUG",
      description: "Bug report",
    });
    await SupportStore.createTicket({
      userId: "test-user-2",
      subject: "Ticket from User 2",
      category: "BILLING",
      description: "Billing question",
    });

    const req = createMockRequest("http://localhost:3000/api/v1/admin/support", {
      token: "test-admin-1",
    });

    const res = await getAdminTicketsApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.tickets.length).toBe(2);
    expect(json.data.total).toBe(2);
  });

  // 11. non-admin cannot list admin tickets
  it("11. non-admin cannot list admin tickets", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/admin/support", {
      token: "test-user-1",
    });

    const res = await getAdminTicketsApi(req);
    expect(res.status).toBe(403);
  });

  // 12. admin can view ticket
  it("12. admin can view ticket", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Ticket to inspect by admin",
      category: "CALCULATOR",
      description: "Check this out",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}`,
      { token: "test-admin-1" }
    );

    const res = await getAdminTicketDetailApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(ticket.id);
  });

  // 13. admin can assign ticket
  it("13. admin can assign ticket", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Unassigned ticket",
      category: "BILLING",
      description: "Please assign me",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}/assign`,
      {
        method: "POST",
        token: "test-admin-1",
        body: { assignedAdminId: "test-admin-2" },
      }
    );

    const res = await postAdminAssignApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.assignedAdminId).toBe("test-admin-2");

    // Verify in store
    const updated = await SupportStore.getTicketForAdmin(ticket.id);
    expect(updated.assignedAdminId).toBe("test-admin-2");
  });

  // 14. admin can change status
  it("14. admin can change status", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Status test",
      category: "ACCOUNT",
      description: "Testing status change",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}/status`,
      {
        method: "POST",
        token: "test-admin-1",
        body: { status: "IN_PROGRESS" },
      }
    );

    const res = await postAdminStatusApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("IN_PROGRESS");
  });

  // 15. admin can change priority
  it("15. admin can change priority", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Priority test",
      category: "BUG",
      description: "Testing priority escalation",
    });
    expect(ticket.priority).toBe("NORMAL");

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}`,
      {
        method: "PATCH",
        token: "test-admin-1",
        body: { priority: "URGENT" },
      }
    );

    const res = await patchAdminTicketApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.priority).toBe("URGENT");
  });

  // 16. admin can reply
  it("16. admin can reply", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Reply test",
      category: "ACCOUNT",
      description: "How do I reset my password?",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}/reply`,
      {
        method: "POST",
        token: "test-admin-1",
        body: { body: "You can reset your password at /forgot-password." },
      }
    );

    const res = await postAdminReplyApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.authorType).toBe("ADMIN");
    expect(json.data.isInternal).toBe(false);
  });

  // 17. admin can add internal note
  it("17. admin can add internal note", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Note test",
      category: "BUG",
      description: "Calculator issue",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}/internal-note`,
      {
        method: "POST",
        token: "test-admin-1",
        body: { body: "Escalated to engineering for review." },
      }
    );

    const res = await postAdminInternalNoteApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.isInternal).toBe(true);
    expect(json.data.authorType).toBe("ADMIN");
  });

  // 18. internal note hidden from user
  it("18. internal note hidden from user", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Internal isolation test",
      category: "ACCOUNT",
      description: "User question",
    });

    // Admin adds internal note
    await SupportStore.addMessage({
      ticketId: ticket.id,
      authorUserId: "test-admin-1",
      authorType: "ADMIN",
      body: "Top secret internal operational note",
      isInternal: true,
    });

    // Admin adds public reply
    await SupportStore.addMessage({
      ticketId: ticket.id,
      authorUserId: "test-admin-1",
      authorType: "ADMIN",
      body: "Public response to user",
      isInternal: false,
    });

    // User fetches ticket
    const userView = await SupportStore.getTicketForUser(ticket.id, "test-user-1");
    expect(userView.messages.some((m) => m.isInternal)).toBe(false);
    expect(
      userView.messages.some((m) =>
        m.body.includes("Top secret internal operational note")
      )
    ).toBe(false);
    expect(
      userView.messages.some((m) => m.body.includes("Public response to user"))
    ).toBe(true);
  });

  // 19. internal note excluded from export
  it("19. internal note excluded from export", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-export",
      subject: "Export test ticket",
      category: "BILLING",
      description: "Export me",
    });

    await SupportStore.addMessage({
      ticketId: ticket.id,
      authorUserId: "test-admin-1",
      authorType: "ADMIN",
      body: "Internal note that must never be in user export",
      isInternal: true,
    });

    const exportData = await SupportStore.getUserExportData("test-user-export");
    expect(exportData.length).toBe(1);
    const exportedMessages = exportData[0].messages;
    expect(
      exportedMessages.some((m) =>
        m.body.includes("Internal note that must never be in user export")
      )
    ).toBe(false);
  });

  // 20. internal note excluded from notification
  it("20. internal note excluded from notification", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Notification privacy test",
      category: "ACCOUNT",
      description: "Initial message",
    });

    NotificationStore.clear();

    // Adding internal note must NOT dispatch notification to the user
    await SupportService.addInternalNote({
      ticketId: ticket.id,
      adminUserId: "test-admin-1",
      body: "Confidential internal note",
    });

    const notifications = await NotificationStore.getNotifications("test-user-1");
    expect(notifications.notifications.length).toBe(0);
  });

  // 21. ticket number generated safely
  it("21. ticket number generated safely", () => {
    const num1 = SupportStore.generateTicketNumber();
    const num2 = SupportStore.generateTicketNumber();
    expect(num1).toMatch(/^TAH-\d{4}-\d{6}$/);
    expect(num2).toMatch(/^TAH-\d{4}-\d{6}$/);
    expect(num1).not.toBe(num2);
  });

  // 22. ticket number cannot be client supplied
  it("22. ticket number cannot be client supplied", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      method: "POST",
      token: "test-user-1",
      body: {
        ticketNumber: "SPOOFED-9999",
        subject: "Attempting to spoof ticket number",
        category: "OTHER",
        description: "Should ignore spoofed ticket number",
      },
    });

    const res = await postUserTicketApi(req);
    const json = await res.json();
    expect(json.data.ticketNumber).not.toBe("SPOOFED-9999");
    expect(json.data.ticketNumber).toMatch(/^TAH-\d{4}-\d{6}$/);
  });

  // 23. invalid category rejected
  it("23. invalid category rejected", () => {
    const result = createSupportTicketSchema.safeParse({
      subject: "Valid subject length",
      category: "NON_EXISTENT_CATEGORY",
      description: "Some message",
    });
    expect(result.success).toBe(false);
  });

  // 24. invalid status rejected
  it("24. invalid status rejected", () => {
    const result = adminUpdateStatusSchema.safeParse({
      status: "COMPLETELY_INVALID_STATUS",
    });
    expect(result.success).toBe(false);
  });

  // 25. invalid priority rejected
  it("25. invalid priority rejected", () => {
    const result = adminUpdatePrioritySchema.safeParse({
      priority: "SUPER_DUPER_URGENT",
    });
    expect(result.success).toBe(false);
  });

  // 26. oversized subject rejected
  it("26. oversized subject rejected", () => {
    const longSubject = "A".repeat(161);
    const result = createSupportTicketSchema.safeParse({
      subject: longSubject,
      category: "ACCOUNT",
      description: "Description",
    });
    expect(result.success).toBe(false);
  });

  // 27. oversized message rejected
  it("27. oversized message rejected", () => {
    const longBody = "A".repeat(5001);
    const result = addSupportMessageSchema.safeParse({
      body: longBody,
    });
    expect(result.success).toBe(false);
  });

  // 28. HTML injection sanitized/rejected
  it("28. HTML injection sanitized/rejected", () => {
    const dirty = "Hello <b>bold text</b> and <iframe src='evil.com'></iframe> world!";
    const clean = sanitizeSupportText(dirty);
    expect(clean).toBe("Hello bold text and  world!");
    expect(clean).not.toContain("<b>");
    expect(clean).not.toContain("<iframe");
  });

  // 29. script injection blocked
  it("29. script injection blocked", () => {
    const attack = "<script>alert('XSS')</script>Normal inquiry text";
    const clean = sanitizeSupportText(attack);
    expect(clean).toBe("Normal inquiry text");
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("alert");
  });

  // 30. user cannot spoof userId
  it("30. user cannot spoof userId", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      method: "POST",
      token: "test-user-1",
      body: {
        userId: "victim-user-id-to-spoof",
        subject: "Spoofing attempt",
        category: "ACCOUNT",
        description: "Checking user ID server-derivation",
      },
    });

    const res = await postUserTicketApi(req);
    const json = await res.json();
    expect(json.data.userId).toBe("test-user-1");
  });

  // 31. admin identity derived server-side
  it("31. admin identity derived server-side", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Admin test ticket",
      category: "BILLING",
      description: "Billing issue",
    });

    const req = createMockRequest(
      `http://localhost:3000/api/v1/admin/support/${ticket.id}/reply`,
      {
        method: "POST",
        token: "test-admin-1",
        body: {
          adminUserId: "fake-admin-spoof",
          body: "Official reply",
        },
      }
    );

    const res = await postAdminReplyApi(req, {
      params: Promise.resolve({ id: ticket.id }),
    });
    const json = await res.json();
    expect(json.data.authorUserId).toBe("test-admin-1");
  });

  // 32. ticket ownership enforced
  it("32. ticket ownership enforced", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-owner",
      subject: "Ownership test",
      category: "ACCOUNT",
      description: "Owned by test-user-owner",
    });

    await expect(
      SupportStore.getTicketForUser(ticket.id, "different-user")
    ).rejects.toThrow("You do not have permission to view this support ticket.");
  });

  // 33. calculation context stores only safe metadata
  it("33. calculation context stores only safe metadata", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-1",
      subject: "Calculation reference question",
      category: "TAX_CALCULATION",
      description: "What did line 4 mean?",
      safeContext: {
        calculationId: "calc-12345",
        calculatorType: "income_tax",
        taxYear: 2026,
        filingStatus: "Single",
        engineVersion: "1.0.0",
        rulesVersion: "2026.1",
      },
    });

    expect(ticket.safeContext?.calculationId).toBe("calc-12345");
    expect(ticket.safeContext?.taxYear).toBe(2026);
    expect(ticket.safeContext?.filingStatus).toBe("Single");
    // Verify no dollar or tax liability fields
    expect((ticket.safeContext as Record<string, unknown>).wages).toBeUndefined();
    expect((ticket.safeContext as Record<string, unknown>).taxLiability).toBeUndefined();
    expect((ticket.safeContext as Record<string, unknown>).refund).toBeUndefined();
  });

  // 34. full tax snapshot is not copied into ticket
  it("34. full tax snapshot is not copied into ticket", async () => {
    const ticket = await SupportService.createTicket({
      userId: "test-user-1",
      subject: "Checking snapshot non-duplication",
      category: "TAX_CALCULATION",
      description: "My query",
      safeContext: {
        calculationId: "calc-abc",
        taxYear: 2026,
      },
    });

    expect((ticket as unknown as Record<string, unknown>).snapshot).toBeUndefined();
    expect((ticket as unknown as Record<string, unknown>).inputSnapshot).toBeUndefined();
  });

  // 35. AI conversation is not copied into ticket
  it("35. AI conversation is not copied into ticket", async () => {
    const ticket = await SupportService.createTicket({
      userId: "test-user-1",
      subject: "AI query issue",
      category: "AI_ASSISTANT",
      description: "The AI suggested an unfamiliar deduction",
      safeContext: {
        conversationId: "conv-xyz-789",
      },
    });

    expect(ticket.safeContext?.conversationId).toBe("conv-xyz-789");
    expect((ticket as unknown as Record<string, unknown>).chatHistory).toBeUndefined();
  });

  // 36. report contents are not copied into ticket
  it("36. report contents are not copied into ticket", async () => {
    const ticket = await SupportService.createTicket({
      userId: "test-user-1",
      subject: "Report issue",
      category: "REPORT",
      description: "Report print formatting issue",
      safeContext: {
        reportId: "rep-999",
      },
    });

    expect(ticket.safeContext?.reportId).toBe("rep-999");
    expect((ticket as unknown as Record<string, unknown>).reportHtml).toBeUndefined();
    expect((ticket as unknown as Record<string, unknown>).pdfData).toBeUndefined();
  });

  // 37. ticket creation notification generated
  it("37. ticket creation notification generated", async () => {
    NotificationStore.clear();

    const ticket = await SupportService.createTicket({
      userId: "test-user-notif",
      subject: "Notification generation test",
      category: "ACCOUNT",
      description: "Testing notification trigger",
    });

    const notifs = await NotificationStore.getNotifications("test-user-notif");
    expect(notifs.notifications.length).toBe(1);
    expect(notifs.notifications[0].type).toBe("support_ticket_created");
    expect(notifs.notifications[0].title).toContain(ticket.ticketNumber);
  });

  // 38. admin reply notification generated
  it("38. admin reply notification generated", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "test-user-reply-notif",
      subject: "Waiting for reply notification",
      category: "BILLING",
      description: "Need help",
    });

    NotificationStore.clear();

    await SupportService.addAdminReply({
      ticketId: ticket.id,
      adminUserId: "test-admin-1",
      body: "We have reviewed your billing question.",
    });

    const notifs = await NotificationStore.getNotifications("test-user-reply-notif");
    expect(notifs.notifications.length).toBe(1);
    expect(notifs.notifications[0].type).toBe("support_ticket_reply");
    expect(notifs.notifications[0].message).toContain(
      "We have reviewed your billing question."
    );
  });

  // 39. notification contains no tax data
  it("39. notification contains no tax data", async () => {
    const ticket = await SupportService.createTicket({
      userId: "test-user-tax-free",
      subject: "Tax check notification",
      category: "TAX_CALCULATION",
      description: "Checking tax text",
    });

    const notifs = await NotificationStore.getNotifications("test-user-tax-free");
    const msg = notifs.notifications[0].message;
    expect(msg).not.toMatch(/\$\d+/);
    expect(msg).not.toContain("tax liability");
    expect(msg).not.toContain("refund");
  });

  // 40. email template contains no tax data
  it("40. email template contains no tax data", () => {
    const rendered = NotificationTemplates.supportTicketReply({
      ticketNumber: "TAH-2026-000101",
      subject: "Question on tax bracket",
      ticketId: "mock-ticket-id",
      replyExcerpt: "Our team has reviewed your tax inquiry.",
      siteUrl: "https://taxaihelp.com",
    });

    expect(rendered.html).not.toMatch(/\$\d+/);
    expect(rendered.html).not.toContain("SSN");
    expect(rendered.html).not.toContain("EIN");
    expect(rendered.category).toBe("support");
  });

  // 41. rate limit applies to ticket creation
  it("41. rate limit applies to ticket creation", async () => {
    const userId = "rate-limit-ticket-user";

    // 5 tickets is the limit within the 15-minute window
    for (let i = 0; i < 5; i++) {
      await SupportService.createTicket({
        userId,
        subject: `Ticket number ${i + 1}`,
        category: "ACCOUNT",
        description: `Description ${i + 1}`,
      });
    }

    // 6th ticket must be rate limited
    await expect(
      SupportService.createTicket({
        userId,
        subject: "Ticket number 6",
        category: "ACCOUNT",
        description: "Should fail rate limit",
      })
    ).rejects.toThrow("Too many support requests submitted.");
  });

  // 42. rate limit applies to messages
  it("42. rate limit applies to messages", async () => {
    const userId = "rate-limit-msg-user";
    const ticket = await SupportStore.createTicket({
      userId,
      subject: "Message flood test",
      category: "ACCOUNT",
      description: "Initial message",
    });

    // 15 messages limit in 10-minute window
    for (let i = 0; i < 15; i++) {
      await SupportService.addUserReply({
        ticketId: ticket.id,
        userId,
        body: `Reply number ${i + 1}`,
      });
    }

    // 16th message must fail
    await expect(
      SupportService.addUserReply({
        ticketId: ticket.id,
        userId,
        body: "Reply number 16 should trigger rate limit",
      })
    ).rejects.toThrow("Too many messages sent.");
  });

  // 43. account export includes user-visible support data
  it("43. account export includes user-visible support data", async () => {
    const userId = "test-user-export-full";
    await SupportStore.createTicket({
      userId,
      subject: "Ticket to include in export",
      category: "CALCULATOR",
      description: "Exportable description",
    });

    const exportResult = await AccountDataService.exportUserData(userId);
    expect(exportResult.supportTickets).toBeDefined();
    expect(exportResult.supportTickets?.length).toBe(1);
    expect(exportResult.supportTickets?.[0].subject).toBe(
      "Ticket to include in export"
    );
  });

  // 44. account export excludes admin notes
  it("44. account export excludes admin notes", async () => {
    const userId = "test-user-export-notes";
    const ticket = await SupportStore.createTicket({
      userId,
      subject: "Export test with notes",
      category: "BUG",
      description: "User bug report",
    });

    await SupportStore.addMessage({
      ticketId: ticket.id,
      authorUserId: "test-admin-1",
      authorType: "ADMIN",
      body: "Confidential staff investigation note",
      isInternal: true,
    });

    const exportResult = await AccountDataService.exportUserData(userId);
    const messages = exportResult.supportTickets?.[0].messages || [];
    expect(
      messages.some((m) =>
        m.body.includes("Confidential staff investigation note")
      )
    ).toBe(false);
  });

  // 45. account deletion handles support data
  it("45. account deletion handles support data", async () => {
    const userId = "test-user-to-delete";
    await SupportStore.createTicket({
      userId,
      subject: "Ticket to purge",
      category: "ACCOUNT",
      description: "Purge me please",
    });

    expect(
      (await SupportStore.listTicketsForUser(userId)).tickets.length
    ).toBe(1);

    const deletionResult = await AccountDataService.deleteUserData(userId);
    expect(deletionResult.success).toBe(true);
    expect(deletionResult.recordsPurged.supportTickets).toBe(1);

    expect(
      (await SupportStore.listTicketsForUser(userId)).tickets.length
    ).toBe(0);
  });

  // 46. support feature flag is enforced server-side
  it("46. support feature flag is enforced server-side", async () => {
    await PlatformConfigStore.set("support.enabled", false, "admin");

    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      method: "POST",
      token: "test-user-1",
      body: {
        subject: "Ticket during feature lockdown",
        category: "CALCULATOR",
        description: "Should fail because feature is disabled",
      },
    });

    const res = await postUserTicketApi(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("FEATURE_DISABLED");
  });

  // 47. disabled support blocks ticket creation
  it("47. disabled support blocks ticket creation", async () => {
    await PlatformConfigStore.set("support.enabled", false, "admin");

    await expect(
      SupportService.createTicket({
        userId: "test-user-1",
        subject: "Ticket while disabled",
        category: "BILLING",
        description: "Inquiry",
      })
    ).rejects.toThrow("The Support Center is temporarily undergoing scheduled maintenance.");
  });

  // 48. mandatory security/privacy path remains available
  it("48. mandatory security/privacy path remains available", async () => {
    await PlatformConfigStore.set("support.enabled", false, "admin");

    // SECURITY category must bypass maintenance lockdown!
    const ticket = await SupportService.createTicket({
      userId: "test-user-1",
      subject: "Critical security vulnerability report",
      category: "SECURITY",
      description: "Report of security concern that cannot be blocked by lockdown.",
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.category).toBe("SECURITY");
    expect(ticket.priority).toBe("HIGH"); // Escalated automatically
  });

  // 49. admin stats use real database data
  it("49. admin stats use real database data", async () => {
    await SupportStore.createTicket({
      userId: "user-1",
      subject: "Ticket 1",
      category: "FEEDBACK",
      description: "Feedback",
    });
    const t2 = await SupportStore.createTicket({
      userId: "user-2",
      subject: "Ticket 2",
      category: "BUG",
      description: "Bug",
    });
    await SupportStore.updateStatus(t2.id, "RESOLVED", "test-admin-1");

    const req = createMockRequest("http://localhost:3000/api/v1/admin/support/stats", {
      token: "test-admin-1",
    });

    const res = await getAdminStatsApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.totalCount).toBe(2);
    expect(json.data.openCount).toBe(1);
    expect(json.data.resolvedCount).toBe(1);
    expect(json.data.feedbackCount).toBe(1);
  });

  // 50. pagination is bounded
  it("50. pagination is bounded", () => {
    const filter = supportSearchFilterSchema.parse({
      page: "1",
      limit: "500", // Exceeds max 100
    });
    // Schema caps limit at 100
    expect(filter.limit).toBeLessThanOrEqual(100);
  });

  // 51. search input is bounded
  it("51. search input is bounded", () => {
    const longQuery = "X".repeat(101);
    const result = supportSearchFilterSchema.safeParse({
      search: longQuery,
    });
    expect(result.success).toBe(false);
  });

  // 52. audit event created for admin actions
  it("52. audit event created for admin actions", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "user-audit",
      subject: "Audit test",
      category: "ACCOUNT",
      description: "Testing audit trail",
    });

    AuditLogStore.clear();

    await SupportService.addAdminReply({
      ticketId: ticket.id,
      adminUserId: "test-admin-1",
      body: "Reply that should trigger audit entry",
    });

    const logs = await AuditLogStore.list();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe("support_admin_reply");
    expect(logs[0].targetId).toBe(ticket.id);
  });

  // 53. audit does not contain message bodies
  it("53. audit does not contain message bodies", async () => {
    const ticket = await SupportStore.createTicket({
      userId: "user-audit-privacy",
      subject: "Privacy in audit",
      category: "BUG",
      description: "Details",
    });

    AuditLogStore.clear();

    await SupportService.addInternalNote({
      ticketId: ticket.id,
      adminUserId: "test-admin-1",
      body: "Sensitive internal note body that must never appear in audit metadata",
    });

    const logs = await AuditLogStore.list();
    expect(logs.length).toBe(1);
    const metaString = JSON.stringify(logs[0].metadata || {});
    expect(metaString).not.toContain("Sensitive internal note body");
  });

  // 54. request ID is attached to support API
  it("54. request ID is attached to support API", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/support/tickets", {
      token: "test-user-1",
      headers: { "x-request-id": "req-custom-support-123" },
    });

    const res = await getUserTicketsApi(req);
    expect(res.headers.get("x-request-id")).toBe("req-custom-support-123");
  });

  // 55. existing admin/security/notification tests remain compatible
  it("55. existing admin/security/notification tests remain compatible", async () => {
    // Check that user cannot bypass status workflow (e.g. reopen ticket that is not resolved)
    const openTicket = await SupportStore.createTicket({
      userId: "test-user-workflow",
      subject: "Workflow test",
      category: "ACCOUNT",
      description: "Open ticket",
    });

    await expect(
      SupportStore.updateStatus(openTicket.id, "OPEN", "test-user-workflow", true)
    ).rejects.toThrow(
      "Users can only reopen tickets that are currently in RESOLVED status."
    );

    // Reopening resolved ticket succeeds
    await SupportStore.updateStatus(openTicket.id, "RESOLVED", "test-admin-1", false);
    const reopened = await SupportStore.updateStatus(
      openTicket.id,
      "OPEN",
      "test-user-workflow",
      true
    );
    expect(reopened.status).toBe("OPEN");
  });
});
