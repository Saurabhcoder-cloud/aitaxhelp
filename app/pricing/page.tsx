"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  Shield,
  HelpCircle,
  Calculator,
  ArrowRight,
  Info,
} from "lucide-react";
import { PRODUCT_PLANS } from "@/lib/monetization/plans";

export default function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const freePlan = PRODUCT_PLANS.free;
  const premiumPlan = PRODUCT_PLANS.premium;

  const premiumPrice =
    interval === "monthly"
      ? (premiumPlan.monthlyPriceCents / 100).toFixed(0)
      : (premiumPlan.annualPriceCents / 100).toFixed(0);

  const priceSuffix = interval === "monthly" ? " / month" : " / year";

  return (
    <div className="py-12 sm:py-16 bg-surface-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Tax Planning Plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-base text-surface-600">
            Core federal tax calculations and history are always free. Upgrade when you need expanded AI capacity and unlocked reports.
          </p>

          {/* Billing Interval Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                interval === "monthly"
                  ? "bg-surface-900 text-white shadow-xs"
                  : "bg-white text-surface-600 hover:text-surface-900 border border-surface-200"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setInterval("annual")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                interval === "annual"
                  ? "bg-surface-900 text-white shadow-xs"
                  : "bg-white text-surface-600 hover:text-surface-900 border border-surface-200"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-surface-950 uppercase">
                Save ~35%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Free Plan */}
          <div className="bg-white rounded-3xl border border-surface-200 p-8 shadow-xs flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-surface-500">
                  {freePlan.name} Plan
                </div>
                <h2 className="text-2xl font-bold text-surface-900 tracking-tight">
                  Free Forever
                </h2>
                <p className="text-xs text-surface-600 leading-relaxed">
                  {freePlan.description}
                </p>
              </div>

              <div className="py-2">
                <div className="text-4xl font-extrabold text-surface-900">$0</div>
                <div className="text-xs text-surface-500 mt-1">No credit card required</div>
              </div>

              <div className="space-y-3 pt-4 border-t border-surface-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-surface-700">
                  What is included:
                </div>
                <ul className="space-y-2.5 text-xs text-surface-700">
                  {freePlan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-surface-300 bg-surface-50 hover:bg-surface-100 text-surface-800 text-sm font-semibold transition-colors"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-b from-surface-900 to-surface-950 text-white rounded-3xl border border-brand-800/50 p-8 shadow-lg flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-amber-400 text-surface-950 font-bold rounded-full text-xs uppercase tracking-wider shadow-xs">
                Most Popular
              </span>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {premiumPlan.name} Plan
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  High-Capacity Planning
                </h2>
                <p className="text-xs text-surface-300 leading-relaxed">
                  {premiumPlan.description}
                </p>
              </div>

              <div className="py-2">
                <div className="text-4xl font-extrabold text-white tracking-tight">
                  ${premiumPrice}
                  <span className="text-sm font-normal text-surface-400">{priceSuffix}</span>
                </div>
                <div className="text-xs text-surface-400 mt-1">
                  {interval === "annual" ? "Billed annually ($149/year)" : "Billed monthly, cancel anytime"}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-surface-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-surface-300">
                  Everything in Free, plus:
                </div>
                <ul className="space-y-2.5 text-xs text-surface-200">
                  {premiumPlan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/dashboard/billing"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-xs"
              >
                <span>Upgrade to Premium</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Stripe Architecture Notice */}
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
          <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <strong>Secure Payment Processing:</strong> Card processing and subscription checkouts are handled securely via Stripe. Core deterministic tax calculators remain fully functional and free of charge.
          </div>
        </div>

        {/* Feature Comparison Matrix */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-surface-900 tracking-tight text-center">
            Feature Comparison Matrix
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-surface-700">
              <thead className="border-b border-surface-200 text-surface-500 uppercase font-semibold">
                <tr>
                  <th scope="col" className="py-3 px-4">Feature</th>
                  <th scope="col" className="py-3 px-4 text-center">Free</th>
                  <th scope="col" className="py-3 px-4 text-center">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-surface-900">Deterministic Tax Engine (2025/2026)</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Included</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Included</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-surface-900">Saved Calculation History</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Unlimited</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-surface-900">AI Assistant Daily Capacity</td>
                  <td className="py-3.5 px-4 text-center text-surface-600">10 messages / day</td>
                  <td className="py-3.5 px-4 text-center text-purple-700 font-bold">100 messages / day</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-surface-900">Tax Summary Reports</td>
                  <td className="py-3.5 px-4 text-center text-surface-600">Basic View</td>
                  <td className="py-3.5 px-4 text-center text-purple-700 font-bold">Unlocked Printable / Export</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-surface-900">Scenario Comparison</td>
                  <td className="py-3.5 px-4 text-center text-surface-600">Standard Differential</td>
                  <td className="py-3.5 px-4 text-center text-purple-700 font-bold">Advanced Insights</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-surface-900">CPA / Enrolled Agent Inquiry</td>
                  <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">Standard</td>
                  <td className="py-3.5 px-4 text-center text-purple-700 font-bold">Priority Triage</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto space-y-6 pt-4">
          <h2 className="text-xl font-bold text-surface-900 tracking-tight text-center">
            Frequently Asked Questions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-surface-600">
            <div className="p-4 bg-white rounded-2xl border border-surface-200 space-y-1">
              <div className="font-bold text-surface-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
                <span>Do I have to pay to calculate my taxes?</span>
              </div>
              <p>
                No. All core deterministic federal calculations (Income Tax, Self-Employed, 1099, and Quarterly) are 100% free. We never paywall basic tax math.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-surface-200 space-y-1">
              <div className="font-bold text-surface-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
                <span>How does the AI message limit reset?</span>
              </div>
              <p>
                AI assistant message limits reset daily at 00:00 UTC. Free users receive 10 queries per day; Premium users receive 100 queries per day.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-surface-200 space-y-1">
              <div className="font-bold text-surface-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
                <span>What happens to my data if I downgrade?</span>
              </div>
              <p>
                Your historical saved calculations, profiles, and past conversation sessions remain preserved and completely accessible.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-surface-200 space-y-1">
              <div className="font-bold text-surface-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
                <span>Does TaxAIHelp file with the IRS?</span>
              </div>
              <p>
                No. TaxAIHelp provides educational calculations, insights, and summaries. For formal e-filing, you can connect with our network of CPAs and EAs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
