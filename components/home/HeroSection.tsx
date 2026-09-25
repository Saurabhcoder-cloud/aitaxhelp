import React from "react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-surface-50 via-white to-surface-50/50 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-surface-200">
      {/* Background radial accent */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-200/40 blur-[120px] rounded-full -z-10"
        aria-hidden="true"
      />

      <Container size="xl" className="text-center">
        {/* Top Trust Pill */}
        <div className="inline-flex items-center gap-2 mb-6">
          <Badge variant="brand" size="md" className="py-1 px-3">
            <span className="w-2 h-2 rounded-full bg-brand-500 mr-1.5 animate-pulse" />
            2025 / 2026 Federal Tax Engine
          </Badge>
          <span className="text-xs font-semibold text-surface-600 hidden sm:inline">
            IRS IRB 2025-45 & Rev. Proc. 2025-32 Verified
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-surface-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Smarter Tax Help, <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-brand-600 to-navy-900 bg-clip-text text-transparent">
            Powered by AI
          </span>
        </h1>

        {/* Supporting Message */}
        <p className="mt-6 text-lg sm:text-xl text-surface-700 max-w-2xl mx-auto leading-relaxed">
          TaxAIHelp helps individual taxpayers, freelancers, 1099 contractors, and small businesses understand their federal tax situations through deterministic calculators, educational resources, and AI-assisted guidance.
        </p>

        {/* Primary and Secondary CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            href="/tax-calculators"
            size="lg"
            className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
          >
            Calculate Your Taxes
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Button>

          <Button
            href="/ai-tax-assistant"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            Ask the AI Tax Assistant
          </Button>
        </div>

        {/* Core Pillars / Value Badges */}
        <div className="mt-16 pt-10 border-t border-surface-200/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-left max-w-5xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-900">Deterministic Math</h4>
              <p className="text-xs text-surface-600 mt-0.5">Calculated in integer cents, not estimated by LLMs</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-900">1099 & Schedule SE</h4>
              <p className="text-xs text-surface-600 mt-0.5">Self-employment tax and deductible expense models</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-900">Quarterly Deadlines</h4>
              <p className="text-xs text-surface-600 mt-0.5">Form 1040-ES payment vouchers and safe harbor notes</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-900">CPA / EA Network</h4>
              <p className="text-xs text-surface-600 mt-0.5">Seamless matching for complex and verified filings</p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
