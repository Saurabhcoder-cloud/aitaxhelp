import React from "react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { Section } from "../ui/Section";

export function TrustSafetySection() {
  const safetyPillars = [
    {
      title: "Deterministic Engine Math",
      description:
        "Unlike general chatbots that approximate mathematical formulas, our tax calculations are computed via an isolated deterministic engine in integer cents according to published IRS code.",
      icon: "⚙️",
    },
    {
      title: "No Unsupported Guarantees",
      description:
        "We never claim guaranteed refunds, guaranteed tax savings, or IRS endorsement. We provide realistic estimates and transparent methodologies.",
      icon: "🛡️",
    },
    {
      title: "Data Privacy First",
      description:
        "You can run federal calculations anonymously. We never sell your personal information or share financial inputs with unauthorized third parties.",
      icon: "🔒",
    },
    {
      title: "Professional CPA Referral Path",
      description:
        "When your tax situation involves state reciprocity, real estate depreciation, or complex partnerships, we connect you with vetted CPAs and Enrolled Agents.",
      icon: "🤝",
    },
  ];

  return (
    <Section background="white" spacing="lg">
      <Container size="xl">
        <div className="rounded-3xl border border-surface-200 bg-surface-50 p-8 sm:p-12 lg:p-16">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Trust & Compliance Standards
            </span>
            <h3 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight mt-4">
              Built on Transparency, Verification, and Safety
            </h3>
            <p className="mt-3 text-surface-600 text-base sm:text-lg leading-relaxed">
              Tax laws are precise. That’s why TaxAIHelp enforces strict separation between intelligent language guidance and mathematical calculation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {safetyPillars.map((pillar, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white border border-surface-200 shadow-subtle">
                <span className="text-3xl flex-shrink-0">{pillar.icon}</span>
                <div>
                  <h4 className="text-lg font-bold text-surface-900">{pillar.title}</h4>
                  <p className="mt-1 text-sm text-surface-600 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface-500">
            <p>
              Want to review our full legal disclaimer and methodology?
            </p>
            <Link
              href="/disclaimer"
              className="font-semibold text-brand-600 hover:text-brand-700 underline"
            >
              Read Legal Disclaimer & Disclosures →
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
