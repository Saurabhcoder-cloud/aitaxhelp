import React from "react";
import { EmptyState } from "../../../components/ui/EmptyState";

export default function DashboardConversationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">AI Conversations</h2>
          <p className="text-xs text-surface-500">
            Review your past dialogues and educational explanations from the AI Tax Assistant.
          </p>
        </div>
      </div>

      <EmptyState
        title="No Past Conversations Found"
        description="Start a new conversational session to ask tax questions, understand deductions, or explore tax brackets."
        actionLabel="Start New Conversation"
        actionHref="/ai-tax-assistant"
      />
    </div>
  );
}
