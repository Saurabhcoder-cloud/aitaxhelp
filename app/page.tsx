import React from "react";
import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";
import { JsonLd, getOrganizationSchema, getWebSiteSchema } from "@/components/seo/JsonLd";
import { HeroSection } from "../components/home/HeroSection";
import { CalculatorShowcase } from "../components/home/CalculatorShowcase";
import { AIAssistantSection } from "../components/home/AIAssistantSection";
import { HowItWorksSection } from "../components/home/HowItWorksSection";
import { TargetAudienceSection } from "../components/home/TargetAudienceSection";
import { TrustSafetySection } from "../components/home/TrustSafetySection";
import { FAQSection } from "../components/home/FAQSection";
import { FinalCTASection } from "../components/home/FinalCTASection";

export const metadata: Metadata = constructMetadata({
  title: "TaxAIHelp — Smarter Tax Help, Powered by AI & Deterministic Calculators",
  description:
    "Free deterministic US federal tax calculators, 2025 and 2026 progressive brackets, 1099 contractor write-offs, quarterly estimates, and conversational AI guidance.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={getOrganizationSchema()} />
      <JsonLd data={getWebSiteSchema()} />
      <HeroSection />
      <CalculatorShowcase />
      <AIAssistantSection />
      <HowItWorksSection />
      <TargetAudienceSection />
      <TrustSafetySection />
      <FAQSection />
      <FinalCTASection />
    </>
  );
}
