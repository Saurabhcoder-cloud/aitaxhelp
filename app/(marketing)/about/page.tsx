import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card, CardContent } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { ShieldCheck, Cpu, Calculator, CheckCircle2, AlertCircle } from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "About TaxAIHelp — Deterministic Tax Engine & AI Guidance",
  description:
    "Learn how TaxAIHelp combines deterministic integer-cents tax calculations with Google Gemini AI to provide clear, reliable federal tax guidance for 2025 and 2026.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="py-16 bg-surface-50 min-h-screen">
      <Container size="lg">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Header */}
          <div>
            <Badge variant="brand" className="mb-3">
              About TaxAIHelp
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-surface-900 tracking-tight">
              Smarter Tax Help, Powered by AI
            </h1>
            <p className="mt-4 text-base sm:text-lg text-surface-600 leading-relaxed">
              TaxAIHelp was engineered to address a foundational challenge in modern financial technology: Large Language Models are outstanding at natural language explanation, but should never be trusted with autonomous financial arithmetic.
            </p>
          </div>

          {/* Core Philosophy */}
          <Card>
            <CardContent className="p-8 space-y-6 text-sm sm:text-base text-surface-700 leading-relaxed">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
                  <Cpu className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-surface-900">
                  Our Architectural Mandate: Zero AI Arithmetic
                </h2>
              </div>
              <p>
                When architecting TaxAIHelp, our engineering team established an inviolable invariant: <strong>AI models never compute tax math.</strong>
              </p>
              <p>
                Every tax bracket, deduction ceiling, self-employment factor, and quarterly voucher schedule is calculated strictly by our deterministic tax engine in integer cents. The engine implements verified statutory rules from:
              </p>
              <ul className="space-y-2 pl-4 text-sm text-surface-700 list-disc">
                <li>
                  <strong>Tax Year 2025:</strong> IRS Internal Revenue Bulletin 2025-45 / P.L. 119-21 (One Big Beautiful Bill Act) and SSA 2025 Wage Base ($176,100).
                </li>
                <li>
                  <strong>Tax Year 2026:</strong> IRS Revenue Procedure 2025-32 and SSA 2026 Contribution Base ($184,500).
                </li>
              </ul>
              <p>
                Our AI layer (powered by Google Gemini) operates exclusively as an educational translation interface. It interprets user queries, identifies missing tax inputs, attaches verified engine calculations, and translates complex statutory rules into plain English.
              </p>
            </CardContent>
          </Card>

          {/* Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-surface-200 space-y-3">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-base">
                <Calculator className="w-5 h-5" />
                <h3>Deterministic Precision</h3>
              </div>
              <p className="text-sm text-surface-600 leading-relaxed">
                Calculations execute in integer cents with comprehensive automated test suites. Bracket thresholds, standard deductions, and Schedule SE factors remain mathematically reproducible.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-surface-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                <ShieldCheck className="w-5 h-5" />
                <h3>Responsible Transparency</h3>
              </div>
              <p className="text-sm text-surface-600 leading-relaxed">
                We never claim IRS affiliation, CPA certification, guaranteed refunds, or guaranteed filing accuracy. We communicate exact calculator boundaries and provide professional CPA handoff when needed.
              </p>
            </div>
          </div>

          {/* Scope and Limitations */}
          <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Supported Scope & Statutory Limitations</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              TaxAIHelp currently models US Federal individual income taxes (Form 1040), Schedule SE self-employment taxes, 1099 independent contractor expenses, and Form 1040-ES quarterly estimated payments. It does not calculate state or local taxes, foreign income, alternative minimum tax (AMT), or itemized Schedule A deductions.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <Button href="/tax-calculators" size="md">
              Explore Tax Calculators
            </Button>
            <Button href="/tax-guides" variant="outline" size="md">
              Read Educational Tax Guides
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
