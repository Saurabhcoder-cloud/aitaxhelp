import React from "react";
import { Container } from "../ui/Container";
import { Section } from "../ui/Section";
import { Button } from "../ui/Button";

export function FinalCTASection() {
  return (
    <Section background="navy" spacing="xl">
      <Container size="md" className="text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
          Ready to Understand Your Federal Tax Situation?
        </h2>
        <p className="mt-4 text-base sm:text-lg text-surface-300 max-w-xl mx-auto leading-relaxed">
          Get deterministic estimates and AI-powered educational tax guidance tailored for individual taxpayers, freelancers, and small businesses.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            href="/tax-calculators"
            size="lg"
            className="w-full sm:w-auto shadow-lg"
          >
            Calculate Your Taxes
          </Button>

          <Button
            href="/ai-tax-assistant"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-surface-700 text-white hover:bg-navy-800"
          >
            Ask the AI Tax Assistant
          </Button>
        </div>

        <p className="mt-6 text-xs text-surface-400">
          No credit card required. Free educational calculators and deterministic guidance.
        </p>
      </Container>
    </Section>
  );
}
