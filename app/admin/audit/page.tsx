"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Clock,
  User,
  Activity,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { AuditLogEntry } from "@/lib/services/audit-log-store";

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/audit?limit=50");
      if (!res.ok) throw new Error("Failed to load audit logs");
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading audit records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            <span>Privileged Audit Logging</span>
          </h1>
          <p className="text-sm text-surface-600 mt-0.5">
            Immutable, append-only security logs recording all privileged administrative operations.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-surface-50 text-surface-700 text-xs font-semibold rounded-xl border border-surface-200 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Compliance Banner */}
      <div className="p-4 bg-surface-50 border border-surface-200 rounded-2xl text-xs text-surface-700 space-y-1">
        <div className="font-semibold text-surface-900 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>Append-Only Security Audit Trail</span>
        </div>
        <p className="text-surface-600 leading-relaxed">
          Every privileged read, status modification, internal note creation, and inspection is logged server-side. Passwords, auth credentials, and raw calculation snapshots are never logged.
        </p>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-sm font-medium text-surface-600">Loading audit log records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-surface-500">
            <ShieldCheck className="w-10 h-10 text-surface-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-surface-800">No audit events recorded yet</p>
            <p className="text-xs text-surface-400 mt-1">
              Privileged administrative actions will be logged automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-surface-700">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-semibold border-b border-surface-200">
                <tr>
                  <th scope="col" className="px-5 py-3">Timestamp</th>
                  <th scope="col" className="px-4 py-3">Admin User</th>
                  <th scope="col" className="px-4 py-3">Action</th>
                  <th scope="col" className="px-4 py-3">Target</th>
                  <th scope="col" className="px-5 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-surface-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-surface-900">
                      {log.adminUserId}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-surface-100 text-surface-800 border border-surface-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className="font-semibold text-surface-800 capitalize">{log.targetType}</span>
                      {log.targetId && (
                        <div className="font-mono text-surface-400 text-[11px] truncate max-w-xs">
                          {log.targetId}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-surface-500 font-mono">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
