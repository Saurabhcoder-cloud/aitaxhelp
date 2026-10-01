"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Sparkles,
  Loader2,
  ArrowRight,
  Shield,
  FileText,
  Clock,
  RefreshCw,
} from "lucide-react";
import { EntitlementSnapshot } from "@/types/monetization";
import { Button } from "@/components/ui/Button";

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") || "";

  const [snapshot, setSnapshot] = useState<EntitlementSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingAttempt, setPollingAttempt] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function checkSubscription() {
      try {
        const res = await fetch("/api/v1/billing/subscription");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setSnapshot(json.data);
            const isActivated =
              json.data.plan.id === "premium" || json.data.plan.id === "professional";

            // If not yet active and we have made fewer than 5 attempts, poll again after 1.5s
            if (!isActivated && pollingAttempt < 5) {
              timeoutId = setTimeout(() => {
                setPollingAttempt((prev) => prev + 1);
              }, 1500);
              return;
            }
          }
        }
      } catch (_err) {
        // Quiet retry
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pollingAttempt]);

  const isVerifiedActive =
    snapshot &&
    (snapshot.plan.id === "premium" || snapshot.plan.id === "professional") &&
    (snapshot.subscription?.status === "active" || snapshot.subscription?.status === "trialing");

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 bg-surface-50">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-surface-200 shadow-xl p-6 sm:p-8 space-y-6">
        {loading || (!isVerifiedActive && pollingAttempt < 5) ? (
          /* State 1: Verification in progress (truthful) */
          <div className="text-center space-y-4 py-8">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-surface-900">
                Payment Received
              </h2>
              <p className="text-sm text-surface-600 leading-relaxed max-w-sm mx-auto">
                Your payment was received. Your subscription is being activated by our billing system.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-surface-500 pt-2 font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Verifying server-side entitlements...</span>
            </div>
          </div>
        ) : isVerifiedActive ? (
          /* State 2: Verified Active Subscription */
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Verified Active
              </span>
              <h1 className="text-2xl font-extrabold text-surface-900 tracking-tight mt-1">
                {snapshot.plan.name} Subscription Active
              </h1>
              <p className="text-xs sm:text-sm text-surface-600 leading-relaxed max-w-md mx-auto">
                Your account has been upgraded with full access to high-capacity AI guidance, comprehensive tax summary reports, and advanced planning insights.
              </p>
            </div>

            {/* Unlocked Benefits Summary */}
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-left space-y-2.5 text-xs">
              <span className="font-bold text-purple-950 uppercase tracking-wider block text-[11px]">
                Unlocked Premium Features
              </span>
              <ul className="space-y-2 text-surface-700">
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>100 AI Tax Assistant messages per day (10x capacity)</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Unlocked Comprehensive Tax Summary Reports & Exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Advanced Multi-Scenario Tax Comparison & Bracket Insights</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/dashboard" className="flex-1">
                <Button variant="primary" size="md" className="w-full gap-2 text-xs font-semibold">
                  <span>Go to Tax Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/billing" className="flex-1">
                <Button variant="outline" size="md" className="w-full text-xs font-medium">
                  Manage Billing
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* State 3: Timeout / Webhook Still Processing */
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-surface-900">
                Activation in Progress
              </h2>
              <p className="text-xs text-surface-600 leading-relaxed max-w-sm mx-auto">
                Your payment was received. Your subscription is being activated. If your plan does not update within a few moments, please refresh.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPollingAttempt(0)}
                className="gap-2 text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Status Again</span>
              </Button>
            </div>
          </div>
        )}

        {sessionId && (
          <div className="pt-3 border-t border-surface-100 text-center">
            <span className="text-[11px] font-mono text-surface-400">
              Checkout Reference: {sessionId.slice(0, 18)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}
