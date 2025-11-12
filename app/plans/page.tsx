
'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { translations } from '@/lib/translations';

export default function PlansPage() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const t = translations[currentLanguage];

  const plans = [
    {
      name: t.pricing.free.name,
      price: { monthly: 0, annual: 0 },
      description: t.pricing.free.description,
      features: [
        t.pricing.free.features.basicCalculator,
        t.pricing.free.features.simpleReturns,
        t.pricing.free.features.emailSupport,
        t.pricing.free.features.basicSecurity
      ],
      popular: false,
      buttonText: t.pricing.free.button,
      buttonStyle: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      name: t.pricing.pro.name,
      price: { monthly: 19.99, annual: 199.99 },
      description: t.pricing.pro.description,
      features: [
        t.pricing.pro.features.advancedCalculator,
        t.pricing.pro.features.multipleReturns,
        t.pricing.pro.features.prioritySupport,
        t.pricing.pro.features.auditProtection,
        t.pricing.pro.features.mobileApp,
        t.pricing.pro.features.dataImport
      ],
      popular: true,
      buttonText: t.pricing.pro.button,
      buttonStyle: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: t.pricing.premium.name,
      price: { monthly: 29.99, annual: 299.99 },
      description: t.pricing.premium.description,
      features: [
        t.pricing.premium.features.unlimitedReturns,
        t.pricing.premium.features.expertReview,
        t.pricing.premium.features.phoneSupport,
        t.pricing.premium.features.maxRefund,
        t.pricing.premium.features.priorYears,
        t.pricing.premium.features.businessReturns,
        t.pricing.premium.features.dedicatedManager
      ],
      popular: false,
      buttonText: t.pricing.premium.button,
      buttonStyle: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  const handlePlanSelect = (planName: string) => {
    console.log(`Selected plan: ${planName} - ${billingCycle}`);
    // Handle plan selection logic here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} />
      
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.pricing.title}</h1>
            <p className="text-xl text-gray-600 mb-8">{t.pricing.subtitle}</p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                {t.pricing.monthly}
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
                {t.pricing.annual}
              </span>
              {billingCycle === 'annual' && (
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {t.pricing.save20}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-xl p-8 ${
                  plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      {t.pricing.mostPopular}
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price[billingCycle]}
                    </span>
                    {plan.price[billingCycle] > 0 && (
                      <span className="text-gray-500">
                        /{billingCycle === 'monthly' ? t.pricing.month : t.pricing.year}
                      </span>
                    )}
                  </div>

                  {billingCycle === 'annual' && plan.price.annual > 0 && (
                    <p className="text-sm text-gray-500">
                      ${(plan.price.annual / 12).toFixed(2)} {t.pricing.perMonth}
                    </p>
                  )}
                </div>

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
                  className={`w-full text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${plan.buttonStyle}`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t.pricing.faq.title}</h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.pricing.faq.q1}</h3>
                <p className="text-gray-600">{t.pricing.faq.a1}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.pricing.faq.q2}</h3>
                <p className="text-gray-600">{t.pricing.faq.a2}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.pricing.faq.q3}</h3>
                <p className="text-gray-600">{t.pricing.faq.a3}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.pricing.faq.q4}</h3>
                <p className="text-gray-600">{t.pricing.faq.a4}</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white">
              <h2 className="text-3xl font-bold mb-4">{t.pricing.cta.title}</h2>
              <p className="text-xl mb-8 text-blue-100">{t.pricing.cta.subtitle}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  {t.pricing.cta.startFree}
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
                  {t.pricing.cta.contactSales}
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
