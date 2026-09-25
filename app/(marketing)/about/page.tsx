import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card, CardContent } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

export const metadata: Metadata = constructMetadata({
  title: "About TaxAIHelp — Our Mission & Engineering Principles",
  description:
    "Learn why TaxAIHelp was founded: to bridge the gap between complex IRS tax codes and accessible, deterministic calculation tools powered by AI.",
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
              TaxAIHelp was created to solve a critical flaw in modern fintech: LLMs are brilliant at explaining concepts in natural language, but notoriously unreliable at financial mathematics.
            </p>
          </div>

          {/* Core Philosophy */}
          <Card>
            <CardContent className="p-8 space-y-6 text-sm sm:text-base text-surface-700 leading-relaxed">
              <h2 className="text-xl font-bold text-surface-900">
                Our Architectural Mandate: No AI Math
              </h2>
              <p>
                When building TaxAIHelp, our engineering team made a foundational architectural decision: <strong>AI must never become the tax calculation source of truth.</strong>
              </p>
              <p>
                Every tax bracket, deduction ceiling, and self-employment factor is calculated through our isolated, deterministic tax engine. The math executes strictly in integer cents according to published IRS Revenue Procedures.
              </p>
              <p>
                Our AI models (powered by Google Gemini) exist solely to extract taxpayer intent, identify missing inputs, and translate the engine’s verified mathematical outputs into clear, actionable human explanations.
              </p>
            </CardContent>
          </Card>

          {/* Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-surface-200">
              <h3 className="font-bold text-surface-900 text-lg mb-2">100% Deterministic</h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                Formulas are sourced directly from IRS documentation (Rev. Proc. 2023-34 and 2022-38) with extensive automated unit test coverage.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-surface-200">
              <h3 className="font-bold text-surface-900 text-lg mb-2">Responsible Transparency</h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                We never make false claims of IRS endorsement or guaranteed refunds. We communicate what our calculators support and when you need a CPA.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
