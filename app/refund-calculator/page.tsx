
'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { translations } from '@/lib/translations';

export default function RefundCalculatorPage() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [formData, setFormData] = useState({
    filingStatus: 'single',
    income: '',
    federalWithholding: '',
    stateWithholding: '',
    dependents: '0',
    deductionType: 'standard',
    itemizedDeductions: '',
    studentLoanInterest: '',
    retirementContributions: ''
  });
  const [results, setResults] = useState<any>(null);

  const t = translations[currentLanguage];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateRefund = () => {
    const income = parseFloat(formData.income) || 0;
    const federalWithholding = parseFloat(formData.federalWithholding) || 0;
    const dependents = parseInt(formData.dependents) || 0;
    
    // Simplified tax calculation (2024 tax brackets)
    let standardDeduction = 13850; // Single filer
    if (formData.filingStatus === 'marriedJoint') standardDeduction = 27700;
    if (formData.filingStatus === 'marriedSeparate') standardDeduction = 13850;
    if (formData.filingStatus === 'headOfHousehold') standardDeduction = 20800;

    const deductions = formData.deductionType === 'standard' 
      ? standardDeduction 
      : parseFloat(formData.itemizedDeductions) || 0;

    const taxableIncome = Math.max(0, income - deductions);
    
    // Simplified tax calculation
    let federalTax = 0;
    if (taxableIncome > 0) {
      if (taxableIncome <= 11000) {
        federalTax = taxableIncome * 0.10;
      } else if (taxableIncome <= 44725) {
        federalTax = 1100 + (taxableIncome - 11000) * 0.12;
      } else if (taxableIncome <= 95375) {
        federalTax = 5147 + (taxableIncome - 44725) * 0.22;
      } else {
        federalTax = 16290 + (taxableIncome - 95375) * 0.24;
      }
    }

    // Child tax credit
    const childTaxCredit = dependents * 2000;
    
    const totalTax = Math.max(0, federalTax - childTaxCredit);
    const refundOrOwed = federalWithholding - totalTax;

    setResults({
      grossIncome: income,
      adjustedGrossIncome: income,
      standardDeduction: deductions,
      taxableIncome,
      federalTax: totalTax,
      childTaxCredit,
      totalWithholding: federalWithholding,
      refundOrOwed,
      effectiveTaxRate: income > 0 ? (totalTax / income * 100) : 0
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} />
      
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.refundCalculator.title}</h1>
            <p className="text-xl text-gray-600">{t.refundCalculator.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.refundCalculator.enterInfo}</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.refundCalculator.filingStatus}
                  </label>
                  <select
                    name="filingStatus"
                    value={formData.filingStatus}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="single">{t.refundCalculator.single}</option>
                    <option value="marriedJoint">{t.refundCalculator.marriedJoint}</option>
                    <option value="marriedSeparate">{t.refundCalculator.marriedSeparate}</option>
                    <option value="headOfHousehold">{t.refundCalculator.headOfHousehold}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.refundCalculator.annualIncome}
                  </label>
                  <input
                    type="number"
                    name="income"
                    value={formData.income}
                    onChange={handleInputChange}
                    placeholder="65000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.refundCalculator.federalWithholding}
                  </label>
                  <input
                    type="number"
                    name="federalWithholding"
                    value={formData.federalWithholding}
                    onChange={handleInputChange}
                    placeholder="8500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.refundCalculator.dependents}
                  </label>
                  <select
                    name="dependents"
                    value={formData.dependents}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[0, 1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.refundCalculator.deductionType}
                  </label>
                  <select
                    name="deductionType"
                    value={formData.deductionType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="standard">{t.refundCalculator.standardDeduction}</option>
                    <option value="itemized">{t.refundCalculator.itemizedDeduction}</option>
                  </select>
                </div>

                {formData.deductionType === 'itemized' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.refundCalculator.itemizedAmount}
                    </label>
                    <input
                      type="number"
                      name="itemizedDeductions"
                      value={formData.itemizedDeductions}
                      onChange={handleInputChange}
                      placeholder="15000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <button
                  onClick={calculateRefund}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                >
                  <i className="ri-calculator-line mr-2"></i>
                  {t.refundCalculator.calculate}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.refundCalculator.results}</h2>
              
              {results ? (
                <div className="space-y-6">
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {results.refundOrOwed >= 0 ? t.refundCalculator.estimatedRefund : t.refundCalculator.estimatedOwed}
                    </h3>
                    <p className={`text-4xl font-bold ${results.refundOrOwed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(results.refundOrOwed).toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">{t.refundCalculator.breakdown}</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{t.refundCalculator.grossIncome}</span>
                        <span className="font-medium">${results.grossIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{t.refundCalculator.standardDeduction}</span>
                        <span className="font-medium">-${results.standardDeduction.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{t.refundCalculator.taxableIncome}</span>
                        <span className="font-medium">${results.taxableIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span>{t.refundCalculator.federalTax}</span>
                        <span className="font-medium">${results.federalTax.toLocaleString()}</span>
                      </div>
                      {results.childTaxCredit > 0 && (
                        <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                          <span>{t.refundCalculator.childTaxCredit}</span>
                          <span className="font-medium text-green-600">-${results.childTaxCredit.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                        <span>{t.refundCalculator.totalWithholding}</span>
                        <span className="font-medium">${results.totalWithholding.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <i className="ri-information-line text-yellow-600 text-xl mt-0.5"></i>
                        <div>
                          <h4 className="font-semibold text-yellow-800">{t.refundCalculator.disclaimer}</h4>
                          <p className="text-yellow-700 text-sm mt-1">{t.refundCalculator.disclaimerText}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <i className="ri-calculator-line text-6xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500">{t.refundCalculator.enterInfoToCalculate}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer currentLanguage={currentLanguage} />
    </div>
  );
}
