"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  MessageSquare,
  Paperclip,
  Clock,
  Shield,
  Loader2,
  Calendar,
  User,
} from "lucide-react";

interface AiAdminData {
  metrics: {
    totalConversations: number;
    totalMessages: number;
    calculationLinkedRequests: number;
    recentActivity: Array<{
      id: string;
      conversationId: string;
      role: "user" | "assistant" | "system";
      createdAt: string;
    }>;
  };
  conversations: Array<{
    id: string;
    userId: string;
    title: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function AdminAiAnalyticsPage() {
  const [data, setData] = useState<AiAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAiData() {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/admin/ai");
        if (!res.ok) throw new Error("Failed to load AI analytics");
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading AI metrics.");
      } finally {
        setLoading(false);
      }
    }

    loadAiData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-surface-600">Loading AI usage analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-semibold text-base mb-1">Failed to Load AI Analytics</h3>
        <p className="text-sm">{error || "Unable to retrieve AI metrics."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-600" />
          <span>AI Tax Assistant Usage & Operational Analytics</span>
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Operational volume, session trends, and calculation-linked guidance requests.
        </p>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 bg-surface-50 border border-surface-200 rounded-2xl flex items-center gap-3 text-xs text-surface-700">
        <Shield className="w-4 h-4 text-brand-600 shrink-0" />
        <span>
          <strong>Taxpayer Privacy Safeguard:</strong> In adherence to strict privacy controls, raw conversation chat content is minimized. Administrators inspect session volumes, timestamps, and message counts without exposing private taxpayer queries.
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <div className="flex items-center gap-2 text-surface-500 mb-2">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Conversations</span>
          </div>
          <div className="text-3xl font-bold text-surface-900">{data.metrics.totalConversations}</div>
          <div className="text-xs text-surface-500 mt-1">Unique assistance sessions created</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <div className="flex items-center gap-2 text-surface-500 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-semibold uppercase tracking-wider">Messages Processed</span>
          </div>
          <div className="text-3xl font-bold text-surface-900">{data.metrics.totalMessages}</div>
          <div className="text-xs text-surface-500 mt-1">Total user queries and assistant responses</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
          <div className="flex items-center gap-2 text-surface-500 mb-2">
            <Paperclip className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider">Calculation Context Requests</span>
          </div>
          <div className="text-3xl font-bold text-surface-900">{data.metrics.calculationLinkedRequests}</div>
          <div className="text-xs text-surface-500 mt-1">Requests with attached tax calculations</div>
        </div>
      </div>

      {/* Sessions and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation Sessions Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-surface-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900">Active AI Sessions</h2>
            <span className="text-xs font-mono text-surface-500">{data.conversations.length} sessions</span>
          </div>

          {data.conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-surface-500">
              No AI conversations recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-surface-700">
                <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold border-b border-surface-200">
                  <tr>
                    <th scope="col" className="px-5 py-3">Session Title</th>
                    <th scope="col" className="px-4 py-3">Messages</th>
                    <th scope="col" className="px-4 py-3">User Ref</th>
                    <th scope="col" className="px-4 py-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {data.conversations.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-surface-900">
                        {c.title}
                        <div className="text-xs font-mono text-surface-400 mt-0.5">{c.id.slice(0, 10)}...</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-surface-800">
                        {c.messageCount} msgs
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-surface-500">
                        {c.userId.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3.5 text-xs text-surface-500">
                        {new Date(c.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operational Timeline */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-surface-900 flex items-center gap-2 border-b border-surface-100 pb-3">
            <Clock className="w-5 h-5 text-surface-600" />
            <span>Recent Activity Events</span>
          </h2>

          {data.metrics.recentActivity.length === 0 ? (
            <div className="text-center py-6 text-xs text-surface-500">
              No recent message activity.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.metrics.recentActivity.map((item) => (
                <div key={item.id} className="p-3 bg-surface-50 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center text-surface-500">
                    <span className="font-semibold uppercase tracking-wider text-surface-800">
                      {item.role}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-surface-400 font-mono text-[11px] truncate">
                    Conv: {item.conversationId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
