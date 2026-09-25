import React from "react";
import { Container } from "../ui/Container";
import { Section } from "../ui/Section";

export function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Input Your Situation",
      description:
        "Select an interactive calculator or chat with the AI assistant. Enter your W-2 wages, 1099 contractor earnings, or ordinary business deductions.",
      badge: "User Interface",
    },
    {
      step: "02",
      title: "Deterministic Engine Math",
      description:
        "Your numbers are validated through Zod schemas and executed in pure integer cents using officially published IRS Revenue Procedure rules. No AI guessing.",
      badge: "Deterministic Core",
    },
    {
      step: "03",
      title: "Clear Tax Insights",
      description:
        "Review comprehensive bracket breakdowns, estimated refunds or balances due, quarterly payment schedules, and connect with licensed CPAs if needed.",
      badge: "Actionable Guidance",
    },
  ];

  return (
    <Section background="white" spacing="lg">
      <Container size="xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-brand-600 mb-2">
            The TaxAIHelp Methodology
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            How TaxAIHelp Works
          </h3>
          <p className="mt-3 text-surface-600 text-base sm:text-lg">
            A reliable pipeline separating deterministic tax calculations from intelligent educational explanations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative p-8 rounded-2xl border border-surface-200 bg-surface-50/50 hover:bg-white hover:shadow-card hover:border-brand-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-4xl font-black text-surface-300 font-mono">
                    {item.step}
                  </span>
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                    {item.badge}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-surface-900 mb-3">
                  {item.title}
                </h4>
                <p className="text-surface-600 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
