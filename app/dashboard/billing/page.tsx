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
} from "lucide-react";
import { EntitlementSnapshot } from "@/types/monetization";
import { UpgradeCard } from "@/components/monetization/UpgradeCard";

export default function DashboardBillingPage() {
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubscription() {
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
    }

    loadSubscription();
  }, []);

  const handleStartCheckout = async () => {
    try {
      setCheckoutLoading(true);
      setCheckoutNotice(null);

      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: "premium",
          interval: "monthly",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Checkout could not be initialized.");
      }

      setCheckoutNotice(json.data.message);
    } catch (err: unknown) {
      setCheckoutNotice(err instanceof Error ? err.message : "Checkout error occurred.");
    } finally {
      setCheckoutLoading(false);
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

  const isPremium = snapshot.plan.id === "premium";
  const aiUsage = snapshot.usage.ai_messages;
  const usagePercentage = Math.min(100, Math.round((aiUsage.current / aiUsage.limit) * 100));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-brand-600" />
          <span>Subscription & Usage Quotas</span>
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Review your current plan tier, daily AI assistant message capacity, and billing details.
        </p>
      </div>

      {checkoutNotice && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Checkout Status:</strong> {checkoutNotice}
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
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                Premium
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

          <div className="pt-2 text-xs text-surface-600 space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-semibold capitalize text-surface-900">
                {snapshot.subscription ? snapshot.subscription.status : "Active (Standard)"}
              </span>
            </div>
            {snapshot.subscription && (
              <div className="flex justify-between">
                <span>Period Ends:</span>
                <span>{new Date(snapshot.subscription.currentPeriodEnd).toLocaleDateString()}</span>
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
              Resets at 00:00 UTC
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
        <div className="space-y-4">
          <UpgradeCard />
        </div>
      )}

      {/* Staging Notice & Provider Details */}
      <div className="p-4 bg-surface-50 border border-surface-200 rounded-2xl text-xs text-surface-600 space-y-1">
        <div className="font-semibold text-surface-900 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-brand-600" />
          <span>Payment Security & Provider Abstraction</span>
        </div>
        <p className="leading-relaxed">
          TaxAIHelp uses server-side Stripe-ready provider architecture. Credit card numbers, banking credentials, and sensitive payment details are never stored on TaxAIHelp servers.
        </p>
      </div>
    </div>
  );
}
