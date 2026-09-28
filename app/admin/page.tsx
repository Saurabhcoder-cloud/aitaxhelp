"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Calculator,
  Sparkles,
  UserCheck,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { AdminOverviewMetrics } from "@/lib/services/admin-overview-store";

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOverview() {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/admin/overview");
        if (!res.ok) {
          throw new Error(`Failed to load admin overview: ${res.statusText}`);
        }
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          throw new Error(json.message || "Failed to parse admin data.");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading overview.");
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-surface-600">Loading operational overview...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-semibold text-base mb-1">Failed to Load Dashboard</h3>
        <p className="text-sm">{error || "Unable to retrieve admin metrics."}</p>
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Registered Users",
      value: data.totalUsers.toLocaleString(),
      subtitle: `${data.newUsers} new in last 30 days`,
      icon: Users,
      href: "/admin/users",
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Professional Leads",
      value: data.professionalLeads.toLocaleString(),
      subtitle: `${data.openLeads} open inquiries requiring CPA review`,
      icon: UserCheck,
      href: "/admin/leads",
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Saved Calculations",
      value: data.savedCalculations.toLocaleString(),
      subtitle: "Deterministic tax engine runs",
      icon: Calculator,
      href: "/admin/calculations",
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      title: "AI Conversations",
      value: data.aiConversations.toLocaleString(),
      subtitle: "Tax guidance sessions with Gemini",
      icon: Sparkles,
      href: "/admin/ai",
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "Reports Generated",
      value: data.reportsGenerated.toLocaleString(),
      subtitle: "Summary packages compiled",
      icon: FileSpreadsheet,
      href: "/admin/reports",
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      title: "Open Lead Backlog",
      value: data.openLeads.toLocaleString(),
      subtitle: "Active pipeline items",
      icon: TrendingUp,
      href: "/admin/leads?status=new",
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 tracking-tight">
          Operational Overview
        </h1>
        <p className="text-sm text-surface-600 mt-1">
          Real-time metrics, professional handoff pipeline, and privileged security oversight.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.title}
              href={kpi.href}
              className="bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs hover:shadow-xs hover:border-surface-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${kpi.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-surface-700 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="text-2xl font-bold text-surface-900 tracking-tight">{kpi.value}</div>
                <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mt-1">
                  {kpi.title}
                </div>
              </div>
              <div className="text-xs text-surface-500 pt-3 mt-3 border-t border-surface-100">
                {kpi.subtitle}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Navigation Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Professional Lead Pipeline Summary */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Lead Pipeline Status</span>
            </h2>
            <Link
              href="/admin/leads"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-surface-700">Open Inquiries</span>
              </div>
              <span className="text-sm font-bold text-surface-900">{data.openLeads}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-400" />
                <span className="text-sm font-medium text-surface-700">Total Lifetime Inquiries</span>
              </div>
              <span className="text-sm font-bold text-surface-900">{data.professionalLeads}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-surface-100">
            <Link
              href="/admin/leads"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-900 hover:bg-surface-800 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <span>Manage Professional Leads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Security & Audit Activity Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-surface-600" />
              <span>Recent Privileged Audit Events</span>
            </h2>
            <Link
              href="/admin/audit"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Full audit log
            </Link>
          </div>

          {data.recentAuditActivity.length === 0 ? (
            <div className="text-center py-8 text-surface-500 text-sm">
              No privileged administrative actions recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.recentAuditActivity.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-surface-50 border border-surface-100 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded font-mono font-semibold bg-surface-200 text-surface-800">
                      {log.action}
                    </span>
                    <span className="text-surface-600 font-medium">
                      target: <span className="font-mono text-surface-900">{log.targetType}/{log.targetId}</span>
                    </span>
                  </div>
                  <span className="text-surface-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
