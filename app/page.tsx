import { FAQSection } from "@/components/sections/faq-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { FormsSection } from "@/components/sections/forms-section";
import { HeroSection } from "@/components/sections/hero-section";
import { HowSection } from "@/components/sections/how-section";
import { NewsSection } from "@/components/sections/news-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { SecuritySection } from "@/components/sections/security-section";
import { ServeSection } from "@/components/sections/serve-section";
import { WhySection } from "@/components/sections/why-section";
import { CTAInline } from "@/components/sections/cta-inline";

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <WhySection />
      <FormsSection />
      <FeaturesSection />
      <HowSection />
      <PricingSection />
      <SecuritySection />
      <ServeSection />
      <NewsSection />
      <FAQSection />
      <CTAInline />
    </div>
  );
}
