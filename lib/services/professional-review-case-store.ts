import crypto from "crypto";
import { TaxYear, TaxFilingStatus } from "@/types/tax";
import {
  ProfessionalReviewCase,
  ProfessionalReviewCaseStatus,
  ProfessionalReviewPriority,
  ProfessionalReviewType,
  ProfessionalReviewComment,
  ReviewCommentSection,
  ReviewCommentSeverity,
  ReviewActorRole,
  ReviewEvent,
  ProfessionalReviewSnapshot,
} from "@/lib/professional/types";
import { assertValidCaseTransition } from "@/lib/professional/state-machine";
import { TaxPreparationSessionStore } from "@/lib/services/tax-preparation-session-store";
import { buildFederalReturn } from "@/lib/preparation/federal-return";
import { buildFederalReturnDocumentPackage } from "@/lib/preparation/federal-return-documents";
import { evaluateEfileReadiness } from "@/lib/preparation/efile-readiness";
import { buildStateTaxSummary } from "@/lib/state-tax/summary";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { NotificationStore } from "@/lib/notifications/store";
import { SUPABASE_CONFIG } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";

// =============================================================================
// GLOBAL IN-MEMORY STORE (Dual Mode & Local Test Execution)
// =============================================================================

declare global {
  // eslint-disable-next-line no-var
  var __professionalReviewCaseStore: Map<string, ProfessionalReviewCase> | undefined;
  // eslint-disable-next-line no-var
  var __professionalReviewCommentStore: Map<string, ProfessionalReviewComment[]> | undefined;
  // eslint-disable-next-line no-var
  var __professionalReviewEventStore: Map<string, ReviewEvent[]> | undefined;
}

function getMemoryStore() {
  if (!globalThis.__professionalReviewCaseStore) {
    globalThis.__professionalReviewCaseStore = new Map<string, ProfessionalReviewCase>();
  }
  if (!globalThis.__professionalReviewCommentStore) {
    globalThis.__professionalReviewCommentStore = new Map<string, ProfessionalReviewComment[]>();
  }
  if (!globalThis.__professionalReviewEventStore) {
    globalThis.__professionalReviewEventStore = new Map<string, ReviewEvent[]>();
  }
  return {
    cases: globalThis.__professionalReviewCaseStore,
    comments: globalThis.__professionalReviewCommentStore,
    events: globalThis.__professionalReviewEventStore,
  };
}

function canonicalizeForChecksum(val: unknown): unknown {
  if (val === null || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(canonicalizeForChecksum);
  const sortedObj: Record<string, unknown> = {};
  for (const key of Object.keys(val).sort()) {
    sortedObj[key] = canonicalizeForChecksum((val as Record<string, unknown>)[key]);
  }
  return sortedObj;
}

function computeSnapshotHash(payload: unknown): string {
  const str = JSON.stringify(canonicalizeForChecksum(payload));
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

export class ProfessionalReviewCaseStore {
  /**
   * Resets all in-memory collections for testing.
   */
  public static clearStore(): void {
    const { cases, comments, events } = getMemoryStore();
    cases.clear();
    comments.clear();
    events.clear();
  }

  /**
   * Builds an authoritative, server-derived snapshot of the taxpayer's tax return.
   * INVARIANT: Never trusts client-supplied calculated numbers.
   */
  public static async buildAuthoritativeSnapshot(
    sessionId: string,
    userId: string
  ): Promise<ProfessionalReviewSnapshot> {
    const session = await TaxPreparationSessionStore.getById(sessionId, userId);
    if (!session) {
      throw new AppError("Tax preparation session not found.", 404, "NOT_FOUND");
    }

    const federalReturn = buildFederalReturn(session);
    const documentPackage = buildFederalReturnDocumentPackage(session);
    const efileReadiness = evaluateEfileReadiness(session, federalReturn);
    const stateSummary = buildStateTaxSummary(session, federalReturn);

    const snapshotPayload = {
      sessionId: session.id,
      userId: session.userId,
      taxYear: session.taxYear,
      filingStatus: federalReturn.filingStatus.label,
      federalReturn,
      stateSummary,
      efileReadiness: {
        isReady: efileReadiness.isReady,
        blockingErrorsCount: efileReadiness.blockingErrors.length,
        warningsCount: efileReadiness.warnings.length,
      },
      documentPackageSummary: documentPackage.summary,
    };

    const checksum = computeSnapshotHash(snapshotPayload);

    return {
      snapshotId: crypto.randomUUID(),
      reconstructedAt: new Date().toISOString(),
      taxYear: session.taxYear,
      filingStatus: federalReturn.filingStatus.label,
      federalReturn,
      stateSummary,
      efileReadiness,
      documentPackage,
      checksum,
    };
  }

  /**
   * Creates a new professional review case requested by an authenticated taxpayer.
   */
  public static async createCase(params: {
    sessionId: string;
    userId: string;
    reviewType?: ProfessionalReviewType;
    priority?: ProfessionalReviewPriority;
    taxpayerNotes?: string;
  }): Promise<ProfessionalReviewCase> {
    const session = await TaxPreparationSessionStore.getById(params.sessionId, params.userId);
    if (!session) {
      throw new AppError("Preparation session not found or does not belong to user.", 404, "NOT_FOUND");
    }

    // Check if an active open case already exists for this session
    const existing = await this.getBySessionId(params.sessionId);
    if (existing && existing.status !== "CLOSED" && existing.status !== "CANCELLED") {
      return existing;
    }

    const taxpayerName =
      session.situationSummary?.taxpayerName ||
      session.profileSnapshot?.fullName ||
      "Taxpayer";
    const taxpayerEmail = `${params.userId}@taxaihelp.user`;
    const filingStatus = (session.householdSnapshot?.filingStatus ||
      session.profileSnapshot?.filingStatus ||
      "single") as TaxFilingStatus;

    const snapshot = await this.buildAuthoritativeSnapshot(params.sessionId, params.userId);

    const now = new Date().toISOString();
    const caseId = crypto.randomUUID();

    const initialEvent: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: params.sessionId,
      actorId: params.userId,
      actorName: taxpayerName,
      actorRole: "taxpayer",
      eventType: "CASE_CREATED",
      description: `Taxpayer requested professional review (${params.reviewType || "cpa"}).`,
      toStatus: "REQUESTED",
      createdAt: now,
    };

    const newCase: ProfessionalReviewCase = {
      id: caseId,
      userId: params.userId,
      taxpayerName,
      taxpayerEmail,
      sessionId: params.sessionId,
      reviewType: params.reviewType || "cpa",
      taxYear: session.taxYear,
      filingStatus,
      status: "REQUESTED",
      priority: params.priority || "NORMAL",
      requestedAt: now,
      taxpayerNotes: params.taxpayerNotes,
      comments: [],
      events: [initialEvent],
      snapshot,
      hasOpenActionRequired: false,
      openCommentsCount: 0,
      resolvedCommentsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Save in-memory
    const { cases, comments, events } = getMemoryStore();
    cases.set(caseId, newCase);
    comments.set(caseId, []);
    events.set(caseId, [initialEvent]);

    // Save in Supabase if configured
    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (tbl: string) => {
            insert: (data: unknown) => Promise<{ error: { message: string } | null }>;
          };
        };
        await supabase.from("professional_review_cases").insert({
          id: newCase.id,
          user_id: newCase.userId,
          session_id: newCase.sessionId,
          tax_year: newCase.taxYear,
          filing_status: newCase.filingStatus,
          taxpayer_name: newCase.taxpayerName,
          taxpayer_email: newCase.taxpayerEmail,
          review_type: newCase.reviewType,
          priority: newCase.priority,
          status: newCase.status,
          requested_at: newCase.requestedAt,
          taxpayer_notes: newCase.taxpayerNotes || null,
          snapshot: newCase.snapshot || null,
          created_at: newCase.createdAt,
          updated_at: newCase.updatedAt,
        });

        await supabase.from("professional_review_events").insert({
          id: initialEvent.id,
          case_id: initialEvent.caseId,
          session_id: initialEvent.sessionId,
          actor_id: initialEvent.actorId,
          actor_name: initialEvent.actorName,
          actor_role: initialEvent.actorRole,
          event_type: initialEvent.eventType,
          description: initialEvent.description,
          to_status: initialEvent.toStatus,
          created_at: initialEvent.createdAt,
        });
      } catch (_e) {
        // Fall back to memory store on DB error
      }
    }

    // Audit log entry
    await AuditLogStore.log({
      userId: params.userId,
      action: "professional_review_case_created",
      targetType: "professional_review_case",
      targetId: caseId,
      metadata: {
        sessionId: params.sessionId,
        reviewType: newCase.reviewType,
        taxYear: newCase.taxYear,
      },
    });

    // In-app notification for taxpayer
    try {
      await NotificationStore.create({
        userId: params.userId,
        category: "professional",
        type: "professional_review_requested",
        title: "Professional Review Requested",
        message: `Your ${session.taxYear} tax return has been submitted for professional review. A tax professional will be assigned soon.`,
        actionUrl: `/dashboard`,
        actionLabel: "View Status",
        isAdminOnly: false,
      });
    } catch (_e) {
      // Continue without failing if notifications fail
    }

    return newCase;
  }

  /**
   * Retrieves a case by ID with full comments and events.
   */
  public static async getById(caseId: string): Promise<ProfessionalReviewCase | null> {
    const { cases, comments, events } = getMemoryStore();
    const c = cases.get(caseId);
    if (c) {
      const caseComments = comments.get(caseId) || [];
      const caseEvents = events.get(caseId) || [];
      return {
        ...c,
        comments: caseComments,
        events: caseEvents,
      };
    }

    if (SUPABASE_CONFIG.isConfigured()) {
      try {
        const supabase = getServerSupabaseClient() as unknown as {
          from: (tbl: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
              };
            };
          };
        };
        const res = await supabase.from("professional_review_cases").select("*").eq("id", caseId).single();
        if (res.data) {
          const row = res.data;
          const mapped: ProfessionalReviewCase = {
            id: row.id as string,
            userId: row.user_id as string,
            sessionId: row.session_id as string,
            taxpayerName: row.taxpayer_name as string,
            taxpayerEmail: row.taxpayer_email as string,
            reviewType: row.review_type as ProfessionalReviewType,
            taxYear: row.tax_year as TaxYear,
            filingStatus: row.filing_status as TaxFilingStatus,
            priority: row.priority as ProfessionalReviewPriority,
            status: row.status as ProfessionalReviewCaseStatus,
            assignedProfessionalId: (row.assigned_professional_id as string) || undefined,
            assignedProfessionalName: (row.assigned_professional_name as string) || undefined,
            assignedAt: (row.assigned_at as string) || undefined,
            requestedAt: row.requested_at as string,
            lastReviewedAt: (row.last_reviewed_at as string) || undefined,
            completedAt: (row.completed_at as string) || undefined,
            closedAt: (row.closed_at as string) || undefined,
            taxpayerNotes: (row.taxpayer_notes as string) || undefined,
            professionalNotes: (row.professional_notes as string) || undefined,
            snapshot: row.snapshot as ProfessionalReviewSnapshot | undefined,
            comments: [],
            events: [],
            hasOpenActionRequired: false,
            openCommentsCount: 0,
            resolvedCommentsCount: 0,
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
          };
          cases.set(caseId, mapped);
          return mapped;
        }
      } catch (_e) {
        // Fall back to memory
      }
    }

    return null;
  }

  /**
   * Retrieves active case for a session ID.
   */
  public static async getBySessionId(sessionId: string): Promise<ProfessionalReviewCase | null> {
    const { cases } = getMemoryStore();
    for (const c of cases.values()) {
      if (c.sessionId === sessionId) {
        return this.getById(c.id);
      }
    }
    return null;
  }

  /**
   * Lists cases with filtering and pagination.
   */
  public static async listCases(filter: {
    userId?: string;
    assignedProfessionalId?: string;
    status?: ProfessionalReviewCaseStatus;
    taxYear?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ cases: ProfessionalReviewCase[]; total: number; page: number; totalPages: number }> {
    const { cases } = getMemoryStore();
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(50, Math.max(1, filter.limit || 20));

    let list = Array.from(cases.values());

    if (filter.userId) {
      list = list.filter((c) => c.userId === filter.userId);
    }
    if (filter.assignedProfessionalId) {
      list = list.filter((c) => c.assignedProfessionalId === filter.assignedProfessionalId);
    }
    if (filter.status) {
      list = list.filter((c) => c.status === filter.status);
    }
    if (filter.taxYear) {
      list = list.filter((c) => c.taxYear === filter.taxYear);
    }

    list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = list.slice((page - 1) * limit, page * limit);

    // Hydrate comments & events
    const hydrated = await Promise.all(paginated.map((c) => this.getById(c.id)));
    const cleanCases = hydrated.filter(Boolean) as ProfessionalReviewCase[];

    return {
      cases: cleanCases,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Assigns a tax professional to an existing case. (Admin or Supervisor action)
   */
  public static async assignProfessional(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole },
    professional: { id: string; name: string }
  ): Promise<ProfessionalReviewCase> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) {
      throw new AppError("Review case not found.", 404, "NOT_FOUND");
    }

    assertValidCaseTransition(reviewCase.status, "ASSIGNED", actor.role);

    const now = new Date().toISOString();
    const fromStatus = reviewCase.status;

    reviewCase.assignedProfessionalId = professional.id;
    reviewCase.assignedProfessionalName = professional.name;
    reviewCase.assignedAt = now;
    reviewCase.status = "ASSIGNED";
    reviewCase.updatedAt = now;

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "PROFESSIONAL_ASSIGNED",
      description: `Assigned to tax professional ${professional.name}.`,
      fromStatus,
      toStatus: "ASSIGNED",
      createdAt: now,
    };

    const { cases, events } = getMemoryStore();
    cases.set(caseId, reviewCase);
    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    await AuditLogStore.log({
      adminUserId: actor.id,
      action: "professional_review_assigned",
      targetType: "professional_review_case",
      targetId: caseId,
      metadata: {
        assignedProfessionalId: professional.id,
        assignedProfessionalName: professional.name,
      },
    });

    try {
      await NotificationStore.create({
        userId: reviewCase.userId,
        category: "professional",
        type: "professional_review_assigned",
        title: "Tax Professional Assigned",
        message: `${professional.name} has been assigned to review your ${reviewCase.taxYear} tax return.`,
        actionUrl: `/dashboard`,
        actionLabel: "View Case",
        isAdminOnly: false,
      });
    } catch (_e) {}

    return reviewCase;
  }

  /**
   * Starts review by the assigned professional.
   */
  public static async startReview(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole }
  ): Promise<ProfessionalReviewCase> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    assertValidCaseTransition(reviewCase.status, "IN_REVIEW", actor.role);

    const now = new Date().toISOString();
    const fromStatus = reviewCase.status;

    reviewCase.status = "IN_REVIEW";
    reviewCase.lastReviewedAt = now;
    reviewCase.updatedAt = now;

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "REVIEW_STARTED",
      description: `${actor.name} began reviewing tax preparation.`,
      fromStatus,
      toStatus: "IN_REVIEW",
      createdAt: now,
    };

    const { cases, events } = getMemoryStore();
    cases.set(caseId, reviewCase);
    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    await AuditLogStore.log({
      userId: actor.id,
      action: "professional_review_started",
      targetType: "professional_review_case",
      targetId: caseId,
    });

    try {
      await NotificationStore.create({
        userId: reviewCase.userId,
        category: "professional",
        type: "professional_review_in_progress",
        title: "Tax Review In Progress",
        message: `${actor.name} is currently reviewing your ${reviewCase.taxYear} tax return.`,
        actionUrl: `/dashboard`,
        actionLabel: "View Case",
        isAdminOnly: false,
      });
    } catch (_e) {}

    return reviewCase;
  }

  /**
   * Adds a structured finding / review comment to a case.
   */
  public static async addComment(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole },
    commentData: {
      section: ReviewCommentSection;
      message: string;
      severity: ReviewCommentSeverity;
    }
  ): Promise<ProfessionalReviewComment> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    if (!commentData.message || commentData.message.trim().length === 0) {
      throw new AppError("Comment message cannot be empty.", 400, "BAD_REQUEST");
    }

    const now = new Date().toISOString();
    const commentId = crypto.randomUUID();

    const comment: ProfessionalReviewComment = {
      id: commentId,
      caseId,
      authorId: actor.id,
      authorName: actor.name,
      authorRole: actor.role,
      section: commentData.section,
      message: commentData.message.trim(),
      severity: commentData.severity,
      status: "OPEN",
      createdAt: now,
    };

    const { cases, comments, events } = getMemoryStore();
    const caseComments = comments.get(caseId) || [];
    caseComments.push(comment);
    comments.set(caseId, caseComments);

    // Update case counters and action required flag
    const openComments = caseComments.filter((c) => c.status === "OPEN");
    reviewCase.openCommentsCount = openComments.length;
    reviewCase.resolvedCommentsCount = caseComments.filter((c) => c.status === "RESOLVED").length;
    reviewCase.hasOpenActionRequired = openComments.some((c) => c.severity === "REQUIRES_ACTION");
    reviewCase.updatedAt = now;
    cases.set(caseId, reviewCase);

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "COMMENT_ADDED",
      description: `Added ${commentData.severity} finding in section [${commentData.section}].`,
      metadata: {
        commentId,
        section: commentData.section,
        severity: commentData.severity,
      },
      createdAt: now,
    };

    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    await AuditLogStore.log({
      userId: actor.id,
      action: "professional_review_comment_added",
      targetType: "professional_review_comment",
      targetId: commentId,
      metadata: {
        caseId,
        section: commentData.section,
        severity: commentData.severity,
      },
    });

    // Notify taxpayer if professional added the comment
    if (actor.role === "professional" || actor.role === "admin") {
      try {
        await NotificationStore.create({
          userId: reviewCase.userId,
          category: "professional",
          type: "professional_review_comment",
          title: "New Review Finding Added",
          message: `${actor.name} noted an item in ${commentData.section}: "${commentData.message.slice(0, 80)}..."`,
          actionUrl: `/dashboard`,
          actionLabel: "Review Finding",
          isAdminOnly: false,
        });
      } catch (_e) {}
    }

    return comment;
  }

  /**
   * Resolves an open review finding.
   */
  public static async resolveComment(
    caseId: string,
    commentId: string,
    actor: { id: string; name: string; role: ReviewActorRole }
  ): Promise<ProfessionalReviewComment> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    const { cases, comments, events } = getMemoryStore();
    const caseComments = comments.get(caseId) || [];
    const comment = caseComments.find((c) => c.id === commentId);

    if (!comment) throw new AppError("Review comment not found.", 404, "NOT_FOUND");

    const now = new Date().toISOString();
    comment.status = "RESOLVED";
    comment.resolvedAt = now;
    comment.resolvedBy = actor.id;
    comment.resolvedByName = actor.name;

    const openComments = caseComments.filter((c) => c.status === "OPEN");
    reviewCase.openCommentsCount = openComments.length;
    reviewCase.resolvedCommentsCount = caseComments.filter((c) => c.status === "RESOLVED").length;
    reviewCase.hasOpenActionRequired = openComments.some((c) => c.severity === "REQUIRES_ACTION");
    reviewCase.updatedAt = now;
    cases.set(caseId, reviewCase);

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "COMMENT_RESOLVED",
      description: `Resolved finding in section [${comment.section}].`,
      metadata: { commentId, section: comment.section },
      createdAt: now,
    };

    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    await AuditLogStore.log({
      userId: actor.id,
      action: "professional_review_comment_resolved",
      targetType: "professional_review_comment",
      targetId: commentId,
      metadata: { caseId },
    });

    return comment;
  }

  /**
   * Professional requests changes from the taxpayer.
   */
  public static async requestChanges(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole },
    notes?: string
  ): Promise<ProfessionalReviewCase> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    assertValidCaseTransition(reviewCase.status, "CHANGES_REQUESTED", actor.role);

    const now = new Date().toISOString();
    const fromStatus = reviewCase.status;

    reviewCase.status = "CHANGES_REQUESTED";
    if (notes) {
      reviewCase.professionalNotes = notes.trim();
    }
    reviewCase.lastReviewedAt = now;
    reviewCase.updatedAt = now;

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "CHANGES_REQUESTED",
      description: `${actor.name} requested changes from taxpayer${notes ? `: ${notes}` : ""}.`,
      fromStatus,
      toStatus: "CHANGES_REQUESTED",
      createdAt: now,
    };

    const { cases, events } = getMemoryStore();
    cases.set(caseId, reviewCase);
    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    await AuditLogStore.log({
      userId: actor.id,
      action: "professional_review_changes_requested",
      targetType: "professional_review_case",
      targetId: caseId,
      metadata: { notes },
    });

    try {
      await NotificationStore.create({
        userId: reviewCase.userId,
        category: "professional",
        type: "professional_review_changes_needed",
        title: "Action Required: CPA/EA Requested Changes",
        message: `${actor.name} reviewed your return and requested adjustments before proceeding.`,
        actionUrl: `/start-my-taxes`,
        actionLabel: "Make Changes",
        isAdminOnly: false,
      });
    } catch (_e) {}

    return reviewCase;
  }

  /**
   * Taxpayer resubmits the preparation session after making adjustments.
   * Re-evaluates authoritative calculation and rebuilds snapshot.
   */
  public static async resubmit(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole },
    taxpayerNotes?: string
  ): Promise<ProfessionalReviewCase> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    // Taxpayer must own this case
    if (actor.role === "taxpayer" && reviewCase.userId !== actor.id) {
      throw new AppError("Not authorized to resubmit this case.", 403, "FORBIDDEN");
    }

    assertValidCaseTransition(reviewCase.status, "IN_REVIEW", actor.role);

    // Reconstruct snapshot from updated session data
    const updatedSnapshot = await this.buildAuthoritativeSnapshot(
      reviewCase.sessionId,
      reviewCase.userId
    );

    const now = new Date().toISOString();
    const fromStatus = reviewCase.status;

    reviewCase.status = "IN_REVIEW";
    if (taxpayerNotes) {
      reviewCase.taxpayerNotes = taxpayerNotes.trim();
    }
    reviewCase.snapshot = updatedSnapshot;
    reviewCase.updatedAt = now;

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "TAXPAYER_RESUBMITTED",
      description: `Taxpayer updated preparation and resubmitted for review.`,
      fromStatus,
      toStatus: "IN_REVIEW",
      createdAt: now,
    };

    const { cases, events } = getMemoryStore();
    cases.set(caseId, reviewCase);
    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    await AuditLogStore.log({
      userId: actor.id,
      action: "professional_review_resubmitted",
      targetType: "professional_review_case",
      targetId: caseId,
      metadata: { checksum: updatedSnapshot.checksum },
    });

    // Notify assigned professional if present
    if (reviewCase.assignedProfessionalId) {
      try {
        await NotificationStore.create({
          userId: reviewCase.assignedProfessionalId,
          category: "professional",
          type: "professional_review_resubmitted",
          title: "Taxpayer Resubmitted Changes",
          message: `${reviewCase.taxpayerName} updated their preparation for ${reviewCase.taxYear} and resubmitted for your review.`,
          actionUrl: `/admin/leads`,
          actionLabel: "Review Changes",
          isAdminOnly: false,
        });
      } catch (_e) {}
    }

    return reviewCase;
  }

  /**
   * Marks case ready for final review.
   */
  public static async markReadyForFinalReview(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole }
  ): Promise<ProfessionalReviewCase> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    assertValidCaseTransition(reviewCase.status, "READY_FOR_FINAL_REVIEW", actor.role);

    const now = new Date().toISOString();
    const fromStatus = reviewCase.status;

    reviewCase.status = "READY_FOR_FINAL_REVIEW";
    reviewCase.lastReviewedAt = now;
    reviewCase.updatedAt = now;

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "READY_FOR_FINAL_REVIEW",
      description: `${actor.name} marked return ready for final review.`,
      fromStatus,
      toStatus: "READY_FOR_FINAL_REVIEW",
      createdAt: now,
    };

    const { cases, events } = getMemoryStore();
    cases.set(caseId, reviewCase);
    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    return reviewCase;
  }

  /**
   * Completes the professional review.
   */
  public static async completeReview(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole },
    completionNotes?: string
  ): Promise<ProfessionalReviewCase> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    assertValidCaseTransition(reviewCase.status, "REVIEW_COMPLETED", actor.role);

    const now = new Date().toISOString();
    const fromStatus = reviewCase.status;

    reviewCase.status = "REVIEW_COMPLETED";
    reviewCase.completedAt = now;
    if (completionNotes) {
      reviewCase.professionalNotes = completionNotes.trim();
    }
    reviewCase.updatedAt = now;

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "REVIEW_COMPLETED",
      description: `Professional review completed by ${actor.name}${completionNotes ? `: ${completionNotes}` : ""}.`,
      fromStatus,
      toStatus: "REVIEW_COMPLETED",
      createdAt: now,
    };

    const { cases, events } = getMemoryStore();
    cases.set(caseId, reviewCase);
    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    await AuditLogStore.log({
      userId: actor.id,
      action: "professional_review_completed",
      targetType: "professional_review_case",
      targetId: caseId,
      metadata: { completionNotes },
    });

    try {
      await NotificationStore.create({
        userId: reviewCase.userId,
        category: "professional",
        type: "professional_review_completed",
        title: "Professional Review Completed",
        message: `Your ${reviewCase.taxYear} tax return has completed CPA/EA review. You may now download your verified preparation package.`,
        actionUrl: `/dashboard`,
        actionLabel: "View Documents",
        isAdminOnly: false,
      });
    } catch (_e) {}

    return reviewCase;
  }

  /**
   * Closes a review case.
   */
  public static async closeCase(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole }
  ): Promise<ProfessionalReviewCase> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    assertValidCaseTransition(reviewCase.status, "CLOSED", actor.role);

    const now = new Date().toISOString();
    const fromStatus = reviewCase.status;

    reviewCase.status = "CLOSED";
    reviewCase.closedAt = now;
    reviewCase.updatedAt = now;

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "CASE_CLOSED",
      description: `Case closed by ${actor.name}.`,
      fromStatus,
      toStatus: "CLOSED",
      createdAt: now,
    };

    const { cases, events } = getMemoryStore();
    cases.set(caseId, reviewCase);
    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    return reviewCase;
  }

  /**
   * Cancels a review case.
   */
  public static async cancelCase(
    caseId: string,
    actor: { id: string; name: string; role: ReviewActorRole }
  ): Promise<ProfessionalReviewCase> {
    const reviewCase = await this.getById(caseId);
    if (!reviewCase) throw new AppError("Review case not found.", 404, "NOT_FOUND");

    assertValidCaseTransition(reviewCase.status, "CANCELLED", actor.role);

    const now = new Date().toISOString();
    const fromStatus = reviewCase.status;

    reviewCase.status = "CANCELLED";
    reviewCase.updatedAt = now;

    const event: ReviewEvent = {
      id: crypto.randomUUID(),
      caseId,
      sessionId: reviewCase.sessionId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      eventType: "CASE_CANCELLED",
      description: `Case cancelled by ${actor.name}.`,
      fromStatus,
      toStatus: "CANCELLED",
      createdAt: now,
    };

    const { cases, events } = getMemoryStore();
    cases.set(caseId, reviewCase);
    const caseEvents = events.get(caseId) || [];
    caseEvents.push(event);
    events.set(caseId, caseEvents);

    return reviewCase;
  }
}
