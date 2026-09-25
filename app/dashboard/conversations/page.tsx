"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ConversationSummary } from "@/types/ai";
import { fetchUserConversations } from "@/lib/utils/ai-assistant-api";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Sparkles,
  ArrowRight,
  PlusCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function DashboardConversationsPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await fetchUserConversations();
    setIsLoading(false);

    if (res.success && res.data) {
      setConversations(res.data);
    } else {
      setErrorMessage(res.error || "Failed to load conversations.");
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_err) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-surface-900">AI Tax Conversations</h2>
            <Badge variant="emerald" size="sm" className="gap-1">
              <ShieldCheck className="w-3 h-3" />
              Verified History
            </Badge>
          </div>
          <p className="text-xs text-surface-500">
            Review past dialogue sessions, educational explanations, and IRS formula breakdowns.
          </p>
        </div>

        <Link href="/ai-tax-assistant">
          <Button size="sm" className="gap-1.5 shadow-sm text-xs">
            <PlusCircle className="w-4 h-4" />
            New Conversation
          </Button>
        </Link>
      </div>

      {/* Content State */}
      {isLoading ? (
        <LoadingState message="Loading your past tax assistance sessions..." />
      ) : errorMessage ? (
        <ErrorState
          title="Could not load conversations"
          message={errorMessage}
          retryAction={loadConversations}
        />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No Past Conversations Found"
          description="Start a new conversational session to ask federal tax questions, explore 1099 deductions, or get verified calculations."
          actionLabel="Start New Conversation"
          actionHref="/ai-tax-assistant"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conversations.map((conv) => (
            <Card
              key={conv.id}
              className="p-5 border-surface-200 hover:border-brand-300 hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-surface-900 line-clamp-1">
                        {conv.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-[11px] text-surface-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-surface-400" />
                          {formatDate(conv.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="neutral" size="sm" className="text-[10px]">
                    {conv.messageCount} {conv.messageCount === 1 ? "msg" : "msgs"}
                  </Badge>
                </div>

                {conv.lastMessage && (
                  <p className="text-xs text-surface-600 line-clamp-2 mt-2 bg-surface-50/70 p-2.5 rounded-lg border border-surface-100 italic">
                    &ldquo;{conv.lastMessage}&rdquo;
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
                <span className="text-[10px] text-surface-400 font-mono">
                  ID: {conv.id.slice(0, 8)}...
                </span>
                <Link href={`/ai-tax-assistant?conversationId=${encodeURIComponent(conv.id)}`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-brand-700 hover:text-brand-900 h-8 px-2.5">
                    Continue Session
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
