"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Shield,
  Calculator,
  Sparkles,
  CreditCard,
  UserCheck,
  Info,
  Clock,
  Settings,
} from "lucide-react";
import { InAppNotification, NotificationCategory } from "@/lib/notifications/types";
import { getSessionToken } from "@/lib/utils/auth-client";

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const query = filter === "unread" ? "?unreadOnly=true&limit=50" : "?limit=50";
      const res = await fetch(`/api/v1/notifications${query}`, {
        headers,
      });

      if (!res.ok) {
        throw new Error("Unable to retrieve notifications.");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications);
        setUnreadCount(json.data.unreadCount);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An error occurred loading your notifications."
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/v1/notifications/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ read: true }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (_err) {
      // Non-blocking UI
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/v1/notifications/read-all", {
        method: "POST",
        headers,
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (_err) {
      // Non-blocking UI
    } finally {
      setIsMarkingAll(false);
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "authentication":
        return <Shield className="w-4 h-4 text-emerald-600" />;
      case "calculations":
        return <Calculator className="w-4 h-4 text-blue-600" />;
      case "ai":
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case "billing":
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case "professional":
        return <UserCheck className="w-4 h-4 text-teal-600" />;
      case "system":
      default:
        return <Info className="w-4 h-4 text-surface-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Important updates regarding your calculations, AI capacity, reports, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-100 text-surface-700 hover:bg-surface-200 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{isMarkingAll ? "Marking..." : "Mark All Read"}</span>
            </button>
          )}

          <Link
            href="/dashboard/settings/notifications"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-300 text-surface-700 hover:bg-surface-50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-surface-500" />
            <span>Preferences</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === "all"
              ? "bg-surface-900 text-white"
              : "bg-surface-100 text-surface-600 hover:bg-surface-200"
          }`}
        >
          All Activity
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === "unread"
              ? "bg-surface-900 text-white"
              : "bg-surface-100 text-surface-600 hover:bg-surface-200"
          }`}
        >
          Unread Only {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Notifications List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-surface-500">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-surface-200 shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center mx-auto text-surface-400">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-surface-900">No notifications found</h3>
          <p className="text-xs text-surface-500 max-w-sm mx-auto">
            {filter === "unread"
              ? "You have marked all notifications as read."
              : "When you save calculations, generate reports, or approach AI usage limits, notifications will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                n.read
                  ? "bg-white border-surface-200"
                  : "bg-brand-50/40 border-brand-200/80 shadow-2xs"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center shrink-0 mt-0.5">
                  {getCategoryIcon(n.category)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-surface-900">{n.title}</span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-surface-600 leading-relaxed">{n.message}</p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-surface-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</span>
                    </span>

                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        className="font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        <span>{n.actionLabel || "View"}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!n.read && (
                <button
                  type="button"
                  onClick={() => handleMarkAsRead(n.id)}
                  className="text-xs font-medium text-surface-500 hover:text-surface-900 shrink-0 px-2 py-1 rounded hover:bg-surface-100 transition-colors"
                  title="Mark this notification as read"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
