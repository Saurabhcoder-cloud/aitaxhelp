
'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PlansPage() {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const plans = [
    {
      name: 'Lifetime Registration',
      price: '$9.99',
      period: 'One-time registration payment',
      description:
        'One-time registration fee for TaxAIHelp. Pay once, use the website for life. No monthly or annual subscription. You only pay again when you prepare a tax return.',
      features: [
        'Lifetime access after a single $9.99 payment',
        'Clear one-time registration',
        'Use the website every tax season',
        'No recurring billing ever',
        'Secure account setup'
      ],
      popular: false,
      buttonText: 'Register Now',
      buttonLink: '/register',
      icon: 'ri-user-add-line'
    },
    {
      name: 'Single Tax Return (Individual)',
      price: '$19.99',
      period: 'Fee per complete return',
      description:
        'Fee for preparing ONE complete tax return for one client filing only for themselves. Includes federal and state return preparation for one individual (e.g., Form 1040 and the appropriate state forms). This fee is paid only when the client prepares a tax return (usually once per year).',
      features: [
        'Covers one individual federal and state filing',
        'Ideal for Form 1040 with the right state forms',
        'Uses TaxAIHelp calculation engine',
        'Pay when you file (typically once yearly)',
        'Clear per-return pricing'
      ],
      popular: true,
      buttonText: 'File Individual Return',
      buttonLink: '/file-taxes',
      icon: 'ri-user-line'
    },
    {
      name: 'Family Tax Return (Married Couple)',
      price: '$24.99',
      period: 'Family return (husband and wife)',
      description:
        'Fee for preparing ONE complete tax return for a husband and wife / married couple filing together (joint return). Includes federal and state return preparation for the married couple. This fee is paid only when the couple prepares a tax return (usually once per year).',
      features: [
        'Joint return for married couples',
        'Federal and state filings included',
        'No monthly or annual subscriptions',
        'Pay per joint return you file',
        'Family-focused support'
      ],
      popular: false,
      buttonText: 'File Family Return',
      buttonLink: '/file-taxes',
      icon: 'ri-team-line'
    }
  ];

  const handlePlanSelect = (planName: string) => {
    console.log(`Selected plan: ${planName}`);
    // Handle plan selection logic here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} />
      
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple One-Time Pricing</h1>
            <p className="text-xl text-gray-600 mb-8">Pay only when you need our services - no subscriptions or hidden fees</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 p-8 ${
                  plan.popular ? 'border-blue-500 scale-105' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${plan.icon} text-2xl text-blue-600`}></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                </div>
                
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium mt-1">{plan.period}</p>
                </div>

                <p className="text-gray-600 mb-8 text-sm leading-relaxed">{plan.description}</p>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <i className="ri-check-line text-green-500 text-xl mt-0.5"></i>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelect(plan.name)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <div className="text-center mb-4">
              <p className="text-gray-700 font-medium max-w-3xl mx-auto">
                You do NOT pay monthly or annually. You pay a one-time $9.99 registration fee and then only pay when you prepare a tax return (once a year in most cases).
              </p>
            </div>

            {/* Payment Methods */}
            <div className="text-center">
              <p className="text-gray-700 mb-4 font-medium">We accept Visa, Mastercard, and Discover.</p>
              <div className="flex justify-center items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">VISA</span>
                  </div>
                  <span className="text-sm text-gray-600">Visa</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">MC</span>
                  </div>
                  <span className="text-sm text-gray-600">Mastercard</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-8 bg-orange-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">DISC</span>
                  </div>
                  <span className="text-sm text-gray-600">Discover</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How does the one-time pricing work?</h3>
                <p className="text-gray-600">You pay a one-time $9.99 registration fee for lifetime access, then only pay when you file your tax return each year ($19.99 individual or $24.99 family).</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Is my data secure?</h3>
                <p className="text-gray-600">Absolutely. We use bank-level encryption and follow strict security protocols to protect your sensitive information.</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What's included in the registration fee?</h3>
                <p className="text-gray-600">The registration fee gives you lifetime access to our platform, tax law guidance, and the ability to prepare your returns every year without additional subscription costs.</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I file for multiple years?</h3>
                <p className="text-gray-600">Yes, you can file tax returns for current and prior years. Each filing requires the appropriate per-filing fee.</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-xl mb-8 text-blue-100">Join thousands who trust TaxHelp AI for simple, affordable tax preparation</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap">
                  Register Now - $9.99
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors whitespace-nowrap">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer currentLanguage={currentLanguage} />
    </div>
  );
}
