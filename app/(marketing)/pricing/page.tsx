import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "../../../lib/seo/metadata";
import { Container } from "../../../components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";

export const metadata: Metadata = constructMetadata({
  title: "Transparent Plans & Pricing",
  description:
    "Explore TaxAIHelp plans: Free deterministic federal tax calculators, AI-assisted tax guidance, and CPA referral services.",
  path: "/pricing",
});

export default function PricingPage() {
  const plans = [
    {
      name: "Free Community",
      price: "$0",
      cadence: "forever free",
      description: "Complete access to all deterministic tax calculators and educational guides.",
      features: [
        "All 4 federal tax calculators (W-2, SE, 1099, Quarterly)",
        "2024 & 2023 verified IRS bracket tables",
        "Deterministic integer-cents calculations",
        "Form 1040-ES payment deadline schedule",
        "Public knowledge base & tax guides",
      ],
      ctaText: "Start Calculating Free",
      ctaHref: "/tax-calculators",
      popular: false,
    },
    {
      name: "TaxAI Pro",
      price: "$19",
      cadence: "per year",
      description: "For active freelancers and contractors wanting unlimited AI guidance and saved scenarios.",
      features: [
        "Everything in Free Community",
        "Unlimited AI Tax Assistant conversations",
        "Save unlimited calculation scenarios",
        "Deduction optimization analysis",
        "Priority guidance on quarterly vouchers",
      ],
      ctaText: "Get Pro Access",
      ctaHref: "/ai-tax-assistant",
      popular: true,
    },
    {
      name: "CPA / EA Advisory",
      price: "Custom",
      cadence: "per engagement",
      description: "Direct matchmaking with vetted, licensed CPAs and Enrolled Agents for formal returns.",
      features: [
        "Formal IRS & state tax return preparation",
        "Audit representation & IRS communication",
        "Multi-state tax apportionment",
        "Entity formation & S-Corp elections",
        "Dedicated human CPA relationship",
      ],
      ctaText: "Request CPA Match",
      ctaHref: "/tax-professionals",
      popular: false,
    },
  ];

  return (
    <div className="py-16 bg-surface-50 min-h-screen">
      <Container size="xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="brand" className="mb-3">
            Simple & Transparent
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-surface-900 tracking-tight">
            Plans for Every Taxpayer
          </h1>
          <p className="mt-4 text-base sm:text-lg text-surface-600">
            Our core federal tax calculators are free for everyone. Upgrade for advanced AI explanations and professional human CPA support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <Card
              key={i}
              variant={plan.popular ? "bordered" : "default"}
              className={`flex flex-col justify-between relative ${
                plan.popular ? "border-brand-600 shadow-card" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="brand" size="sm" className="font-bold uppercase tracking-wider">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-xs text-surface-500 mt-1">{plan.description}</p>
                </CardHeader>

                <div className="my-6">
                  <span className="text-4xl font-black text-surface-900 font-mono">
                    {plan.price}
                  </span>
                  <span className="text-xs text-surface-500 ml-2">{plan.cadence}</span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm text-surface-700">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <svg
                        className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <CardFooter className="px-0 pb-0 pt-8">
                <Button
                  href={plan.ctaHref}
                  variant={plan.popular ? "primary" : "outline"}
                  size="md"
                  className="w-full"
                >
                  {plan.ctaText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Container>
    </div>
  );
}
