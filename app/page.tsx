import React from "react";
import { HeroSection } from "../components/home/HeroSection";
import { CalculatorShowcase } from "../components/home/CalculatorShowcase";
import { AIAssistantSection } from "../components/home/AIAssistantSection";
import { HowItWorksSection } from "../components/home/HowItWorksSection";
import { TargetAudienceSection } from "../components/home/TargetAudienceSection";
import { TrustSafetySection } from "../components/home/TrustSafetySection";
import { FAQSection } from "../components/home/FAQSection";
import { FinalCTASection } from "../components/home/FinalCTASection";

export default function HomePage() {
  return (
    <>
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
