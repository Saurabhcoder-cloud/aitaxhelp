"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
  Shield,
  Info,
  Calendar,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { EntitlementSnapshot } from "@/types/monetization";
import { PRODUCT_PLANS } from "@/lib/monetization/plans";
import { Button } from "@/components/ui/Button";

export default function DashboardBillingPage() {
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "annual">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/billing/subscription");
      if (!res.ok) {
        throw new Error("Failed to load subscription details.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setSnapshot(json.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error retrieving billing state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const handleStartCheckout = async (planId: "premium" | "professional" = "premium") => {
    try {
      setCheckoutLoading(true);
      setNotice(null);

      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          interval: selectedInterval,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Checkout could not be initialized.");
      }

      if (json.data?.url) {
        window.location.href = json.data.url;
      } else {
        setNotice({
          type: "info",
          text: json.data?.message || "Checkout session prepared.",
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Checkout error occurred.",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    try {
      setPortalLoading(true);
      setNotice(null);

      const res = await fetch("/api/v1/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Unable to open billing portal.");
      }

      if (json.data?.url) {
        window.location.href = json.data.url;
      }
    } catch (err: unknown) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Error accessing billing portal.",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-surface-600">Loading subscription & billing status...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-semibold text-base mb-1">Billing Information Unavailable</h3>
        <p className="text-sm">{error || "Could not retrieve your subscription details."}</p>
      </div>
    );
  }

  const isPremium = snapshot.plan.id === "premium" || snapshot.plan.id === "professional";
  const sub = snapshot.subscription;
  const isPastDue = sub?.status === "past_due" || sub?.status === "unpaid";
  const isCanceled = sub?.status === "canceled" || sub?.cancelAtPeriodEnd;
  const aiUsage = snapshot.usage.ai_messages;
  const usagePercentage = Math.min(100, Math.round((aiUsage.current / aiUsage.limit) * 100));

  const premiumPlan = PRODUCT_PLANS.premium;
  const displayPrice =
    selectedInterval === "monthly"
      ? (premiumPlan.monthlyPriceCents / 100).toFixed(0)
      : (premiumPlan.annualPriceCents / 100).toFixed(0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-600" />
            <span>Subscription & Billing</span>
          </h1>
          <p className="text-sm text-surface-600 mt-0.5">
            Manage your subscription tier, billing portal, and verified usage entitlements.
          </p>
        </div>

        {sub?.providerCustomerId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCustomerPortal}
            disabled={portalLoading}
            className="gap-1.5 text-xs font-semibold self-start sm:self-auto"
          >
            {portalLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            <span>Manage Billing (Stripe Portal)</span>
          </Button>
        )}
      </div>

      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
            notice.type === "error"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
        >
          {notice.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          )}
          <div>{notice.text}</div>
        </div>
      )}

      {/* Payment Failure / Past Due Banner */}
      {isPastDue && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Payment Issue Detected</p>
              <p className="mt-0.5 text-amber-800">
                Your latest subscription renewal could not be processed. Your historical tax data and calculations remain completely safe. Please update your payment method to restore high-capacity AI access.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCustomerPortal}
            disabled={portalLoading}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
          >
            Update Payment Method
          </Button>
        </div>
      )}

      {/* Cancellation Scheduled Notice */}
      {sub?.cancelAtPeriodEnd && (
        <div className="p-4 rounded-xl bg-surface-100 border border-surface-200 text-surface-800 text-xs flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-surface-500 shrink-0 mt-0.5" />
          <div>
            <strong>Subscription Cancellation Scheduled:</strong> Your Premium benefits remain active until{" "}
            {new Date(sub.currentPeriodEnd).toLocaleDateString()}. After this date, your account will transition to Free.
          </div>
        </div>
      )}

      {/* Plan Status Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-surface-100 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">
              Current Plan
            </span>
            {isPremium ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                {snapshot.plan.name}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-100 text-surface-700 uppercase">
                Free
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-surface-900 tracking-tight">
              {snapshot.plan.name} Plan
            </h2>
            <p className="text-xs text-surface-500 mt-1">
              {snapshot.plan.tagline}
            </p>
          </div>

          <div className="pt-2 text-xs text-surface-600 space-y-1.5 border-t border-surface-100">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-semibold capitalize text-surface-900">
                {sub ? sub.status.replace(/_/g, " ") : "Active (Standard)"}
              </span>
            </div>
            {sub && (
              <div className="flex justify-between">
                <span>Current Period Ends:</span>
                <span>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            )}
            {sub?.providerCustomerId && (
              <div className="flex justify-between">
                <span>Stripe Customer ID:</span>
                <span className="font-mono text-[11px] text-surface-500">{sub.providerCustomerId.slice(0, 14)}...</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Usage Quota Card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-surface-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-surface-100 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Daily AI Assistant Quota</span>
            </span>
            <span className="text-xs text-surface-500 font-medium">
              Resets Daily at 00:00 UTC
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-surface-700">Messages used today:</span>
              <span className="font-bold text-surface-900">
                {aiUsage.current} / {aiUsage.limit} messages
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-surface-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  usagePercentage > 90
                    ? "bg-red-500"
                    : usagePercentage > 70
                    ? "bg-amber-500"
                    : "bg-brand-500"
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-surface-500 pt-1">
              <span>{aiUsage.remaining} messages remaining today</span>
              <span>{usagePercentage}% consumed</span>
            </div>
          </div>

          <p className="text-xs text-surface-500 pt-1">
            {isPremium
              ? "You are enjoying 100 daily queries with our version-grounded Gemini AI Tax Assistant."
              : "Free plan accounts have 10 daily queries. Upgrade to Premium for 100 queries per day."}
          </p>
        </div>
      </div>

      {/* Upgrade Callout for Free Users */}
      {!isPremium && (
        <div className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade to Premium</span>
              </div>
              <h2 className="text-xl font-bold text-surface-900 mt-2">
                Unlock High-Capacity AI & Full Tax Reports
              </h2>
              <p className="text-xs text-surface-600 mt-0.5">
                Core federal calculations are always free. Upgrade when you need comprehensive reports and 10x AI capacity.
              </p>
            </div>

            {/* Interval Toggle */}
            <div className="flex items-center gap-2 p-1 bg-surface-100 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedInterval("monthly")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedInterval === "monthly"
                    ? "bg-white text-surface-900 shadow-2xs"
                    : "text-surface-600 hover:text-surface-900"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setSelectedInterval("annual")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  selectedInterval === "annual"
                    ? "bg-white text-surface-900 shadow-2xs"
                    : "text-surface-600 hover:text-surface-900"
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] bg-amber-400 text-surface-950 px-1 py-0.2 rounded font-bold">
                  Save 35%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-surface-700 pt-2 border-t border-surface-100">
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100 space-y-1">
              <p className="font-bold text-surface-900">100 AI Queries / Day</p>
              <p className="text-[11px] text-surface-500">10x expansion over Free</p>
            </div>
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100 space-y-1">
              <p className="font-bold text-surface-900">Unlocked Tax Reports</p>
              <p className="text-[11px] text-surface-500">Printable HTML & exports</p>
            </div>
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100 space-y-1">
              <p className="font-bold text-surface-900">Advanced Insights</p>
              <p className="text-[11px] text-surface-500">Bracket & planning deep-dives</p>
            </div>
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100 space-y-1">
              <p className="font-bold text-surface-900">Priority CPA Triage</p>
              <p className="text-[11px] text-surface-500">Expedited consultation intake</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-surface-100">
            <div className="text-left">
              <span className="text-2xl font-black text-surface-900">
                ${displayPrice}
              </span>
              <span className="text-xs text-surface-500">
                {selectedInterval === "monthly" ? " / month" : " / year"}
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => handleStartCheckout("premium")}
              disabled={checkoutLoading}
              className="gap-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Stripe...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Upgrade with Stripe Checkout</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Security & Data Preservation Disclosures */}
      <div className="p-4 bg-surface-50 border border-surface-200 rounded-2xl text-xs text-surface-600 space-y-1.5">
        <div className="font-semibold text-surface-900 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Payment Provider Architecture & Independent Data Preservation</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          All payments and subscriptions are processed securely using Stripe. Credit card and banking credentials are never stored on TaxAIHelp servers. All historical tax calculations, preparation sessions, and saved documents are preserved independently of your subscription status.
        </p>
      </div>
    </div>
  );
}
