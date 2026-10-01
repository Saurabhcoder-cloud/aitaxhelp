"use client";

import React from "react";
import Link from "next/link";
import { XCircle, Calculator, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function BillingCancelPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 bg-surface-50">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-surface-200 shadow-xl p-6 sm:p-8 space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-100 text-surface-500 flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-surface-900 tracking-tight">
            Checkout Cancelled
          </h1>
          <p className="text-xs sm:text-sm text-surface-600 leading-relaxed max-w-sm mx-auto">
            No charges were made to your account. You can continue using TaxAIHelp for free at any time.
          </p>
        </div>

        {/* Reassurance Notice */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-left space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Your Data Is 100% Safe</span>
          </div>
          <p className="text-surface-700 leading-relaxed text-[11px]">
            All your saved calculations, preparation sessions, W-2/1099 inputs, and tax history remain completely preserved and accessible under the Free plan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/dashboard" className="flex-1">
            <Button variant="primary" size="md" className="w-full gap-2 text-xs font-semibold">
              <Calculator className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
          <Link href="/pricing" className="flex-1">
            <Button variant="outline" size="md" className="w-full text-xs font-medium">
              View Plans Again
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
