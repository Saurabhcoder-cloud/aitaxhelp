import React from "react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { Section } from "../ui/Section";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

export function TargetAudienceSection() {
  const audiences = [
    {
      title: "Individual Taxpayers",
      badge: "Form 1040 & W-2",
      description:
        "Understand your marginal tax brackets, maximize your standard vs. itemized deductions, and eliminate withholding surprises.",
      cta: "Calculate Income Tax",
      href: "/tax-calculators/income-tax",
      icon: "👤",
    },
    {
      title: "Freelancers & Creators",
      badge: "1099-NEC & Gig Economy",
      description:
        "Track deductible project expenses, compute your quarterly estimated tax vouchers, and prevent costly year-end penalties.",
      cta: "1099 Tax Calculator",
      href: "/tax-calculators/1099",
      icon: "💻",
    },
    {
      title: "1099 Contract Workers",
      badge: "Independent Contractors",
      description:
        "Calculate true take-home pay after factoring in employer-equivalent 15.3% Social Security and Medicare obligations.",
      cta: "Calculate 1099 Taxes",
      href: "/tax-calculators/1099",
      icon: "📄",
    },
    {
      title: "Self-Employed & Sole Proprietors",
      badge: "Schedule SE & Schedule C",
      description:
        "Accurately calculate statutory 92.35% net profit multipliers and above-the-line deductions for 50% of self-employment tax.",
      cta: "Self-Employed Calculator",
      href: "/tax-calculators/self-employed",
      icon: "⚡",
    },
    {
      title: "Small Businesses & LLCs",
      badge: "Pass-Through Entities",
      description:
        "Model federal tax distributions, understand quarterly safe harbor rules, and prepare structured summaries for your CPA.",
      cta: "Quarterly Calculator",
      href: "/tax-calculators/quarterly-tax",
      icon: "🏢",
    },
  ];

  return (
    <Section background="muted" spacing="lg">
      <Container size="xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-brand-600 mb-2">
            Tailored For Modern Taxpayers
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">
            Who Is TaxAIHelp Built For?
          </h3>
          <p className="mt-3 text-surface-600 text-base sm:text-lg">
            Whether you earn a single W-2 salary, juggle multiple 1099 contracts, or operate an LLC, TaxAIHelp provides clear tax guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {audiences.map((aud, i) => (
            <Card key={i} variant="default" className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{aud.icon}</span>
                  <span className="text-xs font-semibold text-surface-600 bg-surface-100 px-2.5 py-1 rounded-full">
                    {aud.badge}
                  </span>
                </div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-xl">{aud.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pt-0 text-sm text-surface-600 leading-relaxed">
                  {aud.description}
                </CardContent>
              </div>

              <div className="pt-6 border-t border-surface-100 mt-6">
                <Link
                  href={aud.href}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 group"
                >
                  {aud.cta}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
