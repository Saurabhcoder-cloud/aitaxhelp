'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import WorkflowSection from '@/components/WorkflowSection';
import FeaturesSection from '@/components/FeaturesSection';
import EnhancementsSection from '@/components/EnhancementsSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import PricingSection from '@/components/PricingSection';
import ContactSection from '@/components/ContactSection';

export default function HomePage() {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} />
      <main>
        <HeroSection currentLanguage={currentLanguage} />
        <WorkflowSection currentLanguage={currentLanguage} />
        <FeaturesSection currentLanguage={currentLanguage} />
        <EnhancementsSection currentLanguage={currentLanguage} />
        <HowItWorksSection currentLanguage={currentLanguage} />
        <PricingSection currentLanguage={currentLanguage} />
        <ContactSection currentLanguage={currentLanguage} />
      </main>
      <Footer currentLanguage={currentLanguage} />
    </div>
  );
}
