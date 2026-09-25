import React from "react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { Section } from "../ui/Section";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export function AIAssistantSection() {
  return (
    <Section background="navy" spacing="lg">
      <Container size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2">
              <Badge variant="emerald" size="md">
                Gemini AI Powered Guidance
              </Badge>
              <span className="text-xs text-surface-400">
                Engine Math + Natural Explanations
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Ask Any Tax Question. <br />
              <span className="text-brand-400">Get Verified Answers.</span>
            </h2>

            <p className="text-surface-300 text-base sm:text-lg leading-relaxed">
              Tired of confusing IRS tax documents? Our AI Tax Assistant translates federal tax codes into plain English. Most importantly, AI never guesses your tax numbers—all mathematical calculations are executed by our deterministic tax engine.
            </p>

            <ul className="space-y-3 text-sm text-surface-300">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <span>Extracts your tax parameters from conversational sentences</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <span>Zero math hallucinations: calculations run on IRS verified logic</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <span>Tailored for freelancers, contractors, and business deductions</span>
              </li>
            </ul>

            <div className="pt-2">
              <Button href="/ai-tax-assistant" size="lg" className="shadow-lg">
                Launch AI Assistant
              </Button>
            </div>
          </div>

          {/* Right Interactive Visual Simulation */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-6 shadow-2xl backdrop-blur-sm space-y-4">
              {/* Chat Simulation Header */}
              <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    TaxAIHelp Assistant
                  </span>
                </div>
                <span className="text-[11px] text-surface-400 font-mono">
                  Gemini + Deterministic Engine
                </span>
              </div>

              {/* Message 1 (User) */}
              <div className="flex justify-end">
                <div className="bg-brand-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-sm text-sm">
                  “I made $85k on 1099 contracts this year and spent $15k on equipment. How much will I owe?”
                </div>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center py-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400 bg-navy-950 px-3 py-1 rounded-full border border-navy-800">
                  Deterministic Engine Verification Passed
                </span>
              </div>

              {/* Message 2 (Assistant) */}
              <div className="flex justify-start">
                <div className="bg-navy-950 border border-navy-800 text-surface-200 rounded-2xl rounded-tl-none p-4 max-w-md text-sm space-y-2">
                  <p className="font-medium text-white">
                    Based on IRS 2025 tax rules (IRB 2025-45 / OBBBA) computed by our engine:
                  </p>
                  <div className="p-3 rounded-lg bg-navy-900/80 border border-navy-800 text-xs space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-surface-400">Net 1099 Profit:</span>
                      <span className="text-white font-bold">$70,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Schedule SE Tax:</span>
                      <span className="text-emerald-400 font-bold">$9,890.69</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Federal Income Tax:</span>
                      <span className="text-brand-400 font-bold">$5,761.02</span>
                    </div>
                    <div className="flex justify-between border-t border-navy-700 pt-1 text-white font-bold">
                      <span>Total Estimated Tax:</span>
                      <span>$15,651.71</span>
                    </div>
                  </div>
                  <p className="text-xs text-surface-400 leading-relaxed">
                    With the 2025 standard deduction of $15,750 applied, we recommend setting aside approximately 18.4% of each invoice to cover federal liabilities.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/ai-tax-assistant"
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4"
                >
                  Start your own session with the assistant →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
