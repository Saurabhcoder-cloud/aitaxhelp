/**
 * Strongly Typed Support Center & Issue Reporting Models (Phase 5 Step 16)
 *
 * CRITICAL PRIVACY INVARIANT:
 * Support data models store strictly minimal, purpose-based metadata.
 * They NEVER store raw taxpayer SSNs, EINs, bank accounts, wages, tax liabilities,
 * refund numbers, full calculation snapshots, or raw AI chat sessions.
 */

export type SupportCategory =
  | "ACCOUNT"
  | "BILLING"
  | "CALCULATOR"
  | "TAX_CALCULATION"
  | "TAX_QUESTION"
  | "AI_ASSISTANT"
  | "REPORT"
  | "PROFESSIONAL_HANDOFF"
  | "BUG"
  | "FEATURE_REQUEST"
  | "FEEDBACK"
  | "SECURITY"
  | "PRIVACY"
  | "GENERAL"
  | "OTHER";

export type SupportPriority = "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "URGENT";

export type SupportStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "WAITING_INTERNAL"
  | "RESOLVED"
  | "CLOSED";

export type SupportAuthorType = "USER" | "ADMIN" | "SYSTEM";

/**
 * Minimal, non-sensitive context linking a support ticket to platform resources.
 * STRICT INVARIANT: Zero dollar amounts, tax liabilities, refunds, or taxpayer PII.
 */
export interface SupportTicketSafeContext {
  calculationId?: string;
  sessionId?: string;
  calculatorType?: string;
  taxYear?: number;
  filingStatus?: string;
  engineVersion?: string;
  rulesVersion?: string;
  reportId?: string;
  conversationId?: string;
}

export interface SupportAttachmentMetadata {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorUserId: string;
  authorType: SupportAuthorType;
  authorName?: string;
  body: string;
  isInternal: boolean; // CRITICAL: Internal messages are never exposed to ticket owner/public
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string; // Human-readable format, e.g. TAH-2026-000001
  userId: string;
  userEmail?: string;
  userName?: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  safeContext?: SupportTicketSafeContext;
  rating?: number | null; // Optional 1-5 feedback rating
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdBy?: string;
  updatedBy?: string;
}

export interface SupportTicketWithMessages extends SupportTicket {
  messages: SupportMessage[];
}

export interface SupportStats {
  openCount: number;
  inProgressCount: number;
  waitingForUserCount: number;
  waitingInternalCount: number;
  resolvedCount: number;
  closedCount: number;
  urgentCount: number;
  unassignedCount: number;
  totalCount: number;
  feedbackCount: number;
  securityCount: number;
}

export interface SupportTicketListResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
