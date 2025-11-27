
'use client';

import { useState } from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import HowItWorksSection from '../components/HowItWorksSection';
import PricingSection from '../components/PricingSection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import TaxNewsSection from '../components/TaxNewsSection';

export default function Home() {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  return (
    <div className="min-h-screen bg-white">
      <Header 
        currentLanguage={currentLanguage} 
        setCurrentLanguage={setCurrentLanguage} 
      />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TaxNewsSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
