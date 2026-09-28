"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Check, ArrowRight, Shield } from "lucide-react";
import { PRODUCT_PLANS } from "@/lib/monetization/plans";

interface UpgradeCardProps {
  title?: string;
  description?: string;
  featureName?: string;
  className?: string;
}

export function UpgradeCard({
  title = "Unlock Full Tax Planning Power",
  description = "Get 10x AI message capacity, unlocked printable reports, advanced tax planning drivers, and priority CPA inquiry triage.",
  featureName,
  className = "",
}: UpgradeCardProps) {
  const premiumPlan = PRODUCT_PLANS.premium;

  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-surface-900 via-surface-950 to-brand-950 text-white shadow-md border border-brand-900/40 relative overflow-hidden ${className}`}
    >
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{featureName ? `${featureName} • Premium` : "TaxAIHelp Premium"}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {title}
          </h3>

          <p className="text-sm text-surface-300 leading-relaxed">
            {description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-surface-200">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>100 AI messages / day (10x quota)</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Full printable summary reports</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Advanced tax driver breakdowns</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Priority CPA & EA handoff triage</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-start md:items-end gap-3">
          <div className="text-left md:text-right">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ${(premiumPlan.monthlyPriceCents / 100).toFixed(0)}
              <span className="text-xs font-normal text-surface-400"> / month</span>
            </div>
            <div className="text-xs text-amber-400 font-medium">
              or ${(premiumPlan.annualPriceCents / 100).toFixed(0)} / year (save ~35%)
            </div>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <span>View Pricing & Upgrade</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
