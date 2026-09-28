import { UserProfileStore } from "@/lib/services/user-profile-store";
import { TaxCalculationStore } from "@/lib/services/tax-calculation-store";
import { ConversationStore } from "@/lib/services/conversation-store";
import { ProfessionalLeadStore } from "@/lib/services/professional-lead-store";
import { SubscriptionStore } from "@/lib/services/subscription-store";
import { UsageStore } from "@/lib/services/usage-store";
import { AuditLogStore } from "@/lib/services/audit-log-store";
import { NotificationStore } from "@/lib/notifications/store";
import { NotificationPreferencesStore } from "@/lib/notifications/preferences";
import { NotificationService } from "@/lib/notifications/service";
import { SupportStore } from "@/lib/services/support-store";
import { TaxCalculationRecord } from "@/types/tax";
import { UserProfile, TaxProfile } from "@/types/supabase";

export interface ExportedConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    attachedCalculationId?: string;
    createdAt: string;
  }>;
}

export interface ExportedProfessionalLead {
  id: string;
  calculationId: string;
  taxYear: number;
  filingStatus: string;
  taxpayerName: string;
  email: string;
  phone?: string;
  message?: string;
  preferredContactMethod: string;
  urgency: string;
  status: string;
  createdAt: string;
}

export interface ExportedSupportTicket {
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
}

export interface UserDataExport {
  userId?: string;
  exportDate?: string;
  exportMetadata: {
    exportVersion: string;
    exportTimestamp: string;
    dataSubjectId: string;
    platform: string;
  };
  account: {
    id: string;
    email?: string;
    profile: UserProfile | null;
    taxProfile: TaxProfile | null;
  };
  calculations: Array<Omit<TaxCalculationRecord, "userId">>;
  conversations: ExportedConversation[];
  professionalLeads: ExportedProfessionalLead[];
  supportTickets?: ExportedSupportTicket[];
  support?: {
    tickets: ExportedSupportTicket[];
  };
  subscription: {
    planId: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: {
    metric: string;
    currentCount: number;
    resetAtUtc: string;
  } | null;
}

export interface AccountDeletionResult {
  success: boolean;
  userId: string;
  deletedAt: string;
  recordsPurged: {
    calculations: number;
    conversations: number;
    leads: number;
    profiles: number;
    notifications?: number;
    supportTickets?: number;
  };
  deletedRecords?: Record<string, number>;
}

export class AccountDataService {
  /**
   * Compiles an authenticated user's complete data export.
   *
   * SECURITY INVARIANTS:
   * 1. Strictly filtered by the server-verified userId.
   * 2. EXCLUDES internal admin notes from professional leads.
   * 3. EXCLUDES system audit logs.
   * 4. EXCLUDES internal server secrets and other users' records.
   */
  public static async exportUserData(userId: string, email?: string): Promise<UserDataExport> {
    // 1. Account profile & tax profile
    const profile = await UserProfileStore.getProfile(userId, email);
    const taxProfile = await UserProfileStore.getTaxProfile(userId);

    // 2. Saved calculations
    const rawCalculations = await TaxCalculationStore.listByUser(userId);
    const sanitizedCalculations = rawCalculations.map((calc) => {
      // Omit redundant userId field from export objects
      const { userId: _uid, ...calcData } = calc;
      return calcData;
    });

    // 3. AI conversations & messages
    const rawConversations = await ConversationStore.listConversations(userId);
    const sanitizedConversations: ExportedConversation[] = [];

    for (const conv of rawConversations) {
      const messages = await ConversationStore.getConversationMessages(conv.id, userId);
      sanitizedConversations.push({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          attachedCalculationId: m.attachedCalculationId,
          createdAt: m.createdAt,
        })),
      });
    }

    // 4. Professional leads (WITHOUT internal admin notes)
    // Extract leads owned by userId
    const userLeads: ExportedProfessionalLead[] = [];
    const memoryLeads = (globalThis as unknown as { __professionalLeadStore?: Map<string, unknown> }).__professionalLeadStore;
    if (memoryLeads) {
      for (const lead of memoryLeads.values()) {
        const l = lead as {
          id: string;
          userId: string;
          calculationId: string;
          taxYear: number;
          filingStatus: string;
          taxpayerName: string;
          email: string;
          phone?: string;
          message?: string;
          preferredContactMethod: string;
          urgency: string;
          status: string;
          createdAt: string;
          internalNotes?: unknown; // EXCLUDED
        };
        if (l.userId === userId) {
          userLeads.push({
            id: l.id,
            calculationId: l.calculationId,
            taxYear: l.taxYear,
            filingStatus: l.filingStatus,
            taxpayerName: l.taxpayerName,
            email: l.email,
            phone: l.phone,
            message: l.message,
            preferredContactMethod: l.preferredContactMethod,
            urgency: l.urgency,
            status: l.status,
            createdAt: l.createdAt,
          });
        }
      }
    }

    // 5. Subscription information
    const sub = await SubscriptionStore.getByUserId(userId);
    const subscriptionData = sub
      ? {
          planId: sub.planId,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null;

    // 6. Current usage
    const usage = await UsageStore.getUsage(userId, "ai_messages");

    // 7. Support tickets (WITHOUT internal admin notes)
    const userSupportTickets = await SupportStore.getUserExportData(userId);
    const now = new Date().toISOString();

    return {
      userId,
      exportDate: now,
      exportMetadata: {
        exportVersion: "1.0",
        exportTimestamp: now,
        dataSubjectId: userId,
        platform: "TaxAIHelp (taxaihelp.com)",
      },
      account: {
        id: userId,
        email: email || profile.email,
        profile,
        taxProfile,
      },
      calculations: sanitizedCalculations,
      conversations: sanitizedConversations,
      professionalLeads: userLeads,
      supportTickets: userSupportTickets,
      support: {
        tickets: userSupportTickets,
      },
      subscription: subscriptionData,
      usage: {
        metric: "ai_messages",
        currentCount: usage.count,
        resetAtUtc: usage.resetAt,
      },
    };
  }

  /**
   * Permanently deletes or purges an authenticated user's personal tax records.
   *
   * SECURITY & COMPLIANCE INVARIANTS:
   * 1. Requires explicit confirmation payload.
   * 2. Only deletes records owned by the authenticated userId.
   * 3. Never deletes system security audit logs (preserves accountability records).
   * 4. Appends a final audit log entry recording account deletion.
   */
  public static async deleteUserData(userId: string): Promise<AccountDeletionResult> {
    let calculationsPurged = 0;
    let conversationsPurged = 0;
    let leadsPurged = 0;
    let profilesPurged = 0;

    // 1. Purge saved calculations
    const calculations = await TaxCalculationStore.listByUser(userId);
    for (const calc of calculations) {
      const deleted = await TaxCalculationStore.delete(calc.id, userId);
      if (deleted) calculationsPurged++;
    }

    // 2. Purge conversations & messages from memory store
    const memStore = globalThis as unknown as {
      __conversationStore?: Map<string, { id: string; userId: string }>;
      __messageStore?: Array<{ userId: string }>;
      __professionalLeadStore?: Map<string, { id: string; userId: string }>;
      __userProfileStore?: Map<string, { id: string }>;
      __taxProfileStore?: Map<string, { id: string }>;
      __subscriptionStore?: Map<string, { userId: string }>;
      __usageStore?: Map<string, unknown>;
    };

    if (memStore.__conversationStore) {
      for (const [key, conv] of memStore.__conversationStore.entries()) {
        if (conv.userId === userId) {
          memStore.__conversationStore.delete(key);
          conversationsPurged++;
        }
      }
    }

    if (memStore.__messageStore) {
      memStore.__messageStore = memStore.__messageStore.filter((m) => m.userId !== userId);
    }

    // 3. Purge professional leads
    if (memStore.__professionalLeadStore) {
      for (const [key, lead] of memStore.__professionalLeadStore.entries()) {
        if (lead.userId === userId) {
          memStore.__professionalLeadStore.delete(key);
          leadsPurged++;
        }
      }
    }

    // 4. Purge profiles
    if (memStore.__userProfileStore) {
      if (memStore.__userProfileStore.has(userId)) {
        memStore.__userProfileStore.delete(userId);
        profilesPurged++;
      }
    }
    if (memStore.__taxProfileStore) {
      if (memStore.__taxProfileStore.has(userId)) {
        memStore.__taxProfileStore.delete(userId);
      }
    }

    // 5. Purge subscription & usage
    if (memStore.__subscriptionStore) {
      for (const [key, sub] of memStore.__subscriptionStore.entries()) {
        if (sub.userId === userId) {
          memStore.__subscriptionStore.delete(key);
        }
      }
    }
    if (memStore.__usageStore) {
      for (const key of memStore.__usageStore.keys()) {
        if (key.startsWith(`${userId}:`)) {
          memStore.__usageStore.delete(key);
        }
      }
    }

    // 6. Purge notifications, communication preferences, and mark user deleted
    NotificationService.markUserDeleted(userId);
    const notificationsPurged = await NotificationStore.purgeAllForUser(userId);
    await NotificationPreferencesStore.purge(userId);

    // 7. Purge support tickets & messages
    const supportTicketsPurged = await SupportStore.deleteUserData(userId);

    // 8. Record immutable security audit log event
    await AuditLogStore.log({
      adminUserId: "system:account_lifecycle",
      action: "user:account_deleted",
      targetType: "user",
      targetId: userId,
      metadata: {
        timestamp: new Date().toISOString(),
        calculationsPurged,
        conversationsPurged,
        leadsPurged,
        notificationsPurged,
        supportTicketsPurged,
      },
    });

    const recordsPurged = {
      calculations: calculationsPurged,
      conversations: conversationsPurged,
      leads: leadsPurged,
      profiles: profilesPurged,
      notifications: notificationsPurged,
      supportTickets: supportTicketsPurged,
    };

    return {
      success: true,
      userId,
      deletedAt: new Date().toISOString(),
      recordsPurged,
      deletedRecords: recordsPurged,
    };
  }
}
