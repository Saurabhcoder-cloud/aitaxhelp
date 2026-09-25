"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { fetchCalculationHistory } from "@/lib/utils/calculation-history-api";

export default function DashboardOverviewPage() {
  const [savedCount, setSavedCount] = useState<number>(0);

  useEffect(() => {
    fetchCalculationHistory().then((res) => {
      if (res.success && res.data) {
        setSavedCount(res.data.length);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-brand-900 via-navy-900 to-navy-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-card">
        <div className="space-y-2">
          <Badge variant="emerald" size="sm">
            Tax Season 2024 Active
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome to your TaxAIHelp Workspace
          </h2>
          <p className="text-sm text-surface-300 max-w-xl">
            Model your federal taxes, track 1040-ES quarterly installments, and ask our AI assistant for clarification on complex IRS rules.
          </p>
        </div>
        <div className="flex gap-3">
          <Button href="/tax-calculators" size="sm" className="bg-white text-navy-950 hover:bg-surface-100">
            Run Calculation
          </Button>
          <Button href="/ai-tax-assistant" variant="outline" size="sm" className="border-surface-600 text-white hover:bg-navy-800">
            Ask Assistant
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">
            Default Tax Year
          </span>
          <span className="text-3xl font-extrabold text-surface-900 mt-2 block font-mono">
            2025
          </span>
          <p className="text-xs text-surface-500 mt-1">IRS IRB 2025-45 / OBBBA verified</p>
        </Card>

        <Link href="/dashboard/calculations" className="block focus:outline-none">
          <Card className="hover:border-brand-300 transition-colors cursor-pointer">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">
              Saved Scenarios
            </span>
            <span className="text-3xl font-extrabold text-brand-700 mt-2 block font-mono">
              {savedCount}
            </span>
            <p className="text-xs text-brand-600 mt-1 font-medium">View saved calculations →</p>
          </Card>
        </Link>

        <Card>
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider block">
            Active Calculators
          </span>
          <span className="text-3xl font-extrabold text-emerald-600 mt-2 block font-mono">
            4
          </span>
          <p className="text-xs text-surface-500 mt-1">W-2, Schedule SE, 1099, Quarterly</p>
        </Card>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Launch a Federal Tax Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/tax-calculators/income-tax"
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-surface-50 transition-colors"
            >
              <div>
                <span className="font-semibold text-sm text-surface-900 block">Federal Income Tax</span>
                <span className="text-xs text-surface-500">Standard Form 1040 progressive brackets</span>
              </div>
              <span className="text-xs font-bold text-brand-600">Open →</span>
            </Link>

            <Link
              href="/tax-calculators/self-employed"
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-surface-50 transition-colors"
            >
              <div>
                <span className="font-semibold text-sm text-surface-900 block">Self-Employed (Schedule SE)</span>
                <span className="text-xs text-surface-500">Social Security & Medicare calculation</span>
              </div>
              <span className="text-xs font-bold text-brand-600">Open →</span>
            </Link>

            <Link
              href="/tax-calculators/1099"
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-surface-50 transition-colors"
            >
              <div>
                <span className="font-semibold text-sm text-surface-900 block">1099 Contractor Tax</span>
                <span className="text-xs text-surface-500">Expense tracking & recommended savings</span>
              </div>
              <span className="text-xs font-bold text-brand-600">Open →</span>
            </Link>

            <Link
              href="/tax-calculators/quarterly-tax"
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-surface-50 transition-colors"
            >
              <div>
                <span className="font-semibold text-sm text-surface-900 block">Quarterly Estimated (1040-ES)</span>
                <span className="text-xs text-surface-500">Deadlines and installment schedule</span>
              </div>
              <span className="text-xs font-bold text-brand-600">Open →</span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Guidance & Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-surface-600 leading-relaxed">
              Have questions about how your business expenses reduce net self-employment earnings, or how progressive brackets work? Our conversational assistant is available to break down concepts.
            </p>
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 text-xs text-surface-600 space-y-2">
              <span className="font-bold text-surface-900 block">Sample Questions:</span>
              <p>&bull; &ldquo;How much should I set aside for taxes on $90k in 1099 income?&rdquo;</p>
              <p>&bull; &ldquo;What is the standard deduction for head of household?&rdquo;</p>
              <p>&bull; &ldquo;What happens if I miss a quarterly estimated tax deadline?&rdquo;</p>
            </div>
            <Button href="/ai-tax-assistant" size="sm" className="w-full">
              Open AI Tax Assistant
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
