
'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { translations } from '@/lib/translations';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

const stateTaxProfiles: Record<string, { name: string; rate: number; deduction: number; highlights: string[] }> = {
  CA: {
    name: 'California',
    rate: 0.06,
    deduction: 5202,
    highlights: [
      'California applies graduated rates with credits like renter and dependent exemptions.',
      'Standard deduction used unless itemized exceeds it.',
      'State Disability Insurance withholding may reduce your refund or balance due.'
    ]
  },
  NY: {
    name: 'New York',
    rate: 0.058,
    deduction: 8000,
    highlights: [
      'NY offers household credit and child credits that can offset liability.',
      'City taxes may apply for NYC and Yonkers residents.',
      'Standard deduction applied unless itemized state deductions are higher.'
    ]
  },
  TX: { name: 'Texas', rate: 0, deduction: 0, highlights: ['Texas has no state individual income tax.', 'No state return generally required.'] },
  FL: { name: 'Florida', rate: 0, deduction: 0, highlights: ['Florida has no state individual income tax.', 'No separate state filing needed for most taxpayers.'] },
  IL: {
    name: 'Illinois',
    rate: 0.0495,
    deduction: 2400,
    highlights: ['Flat state rate applies to most income.', 'Personal exemption reduces taxable base.', 'Retirement income may be exempt.']
  }
};

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
    retirementContributions: '',
    state: ''
  });
  const [results, setResults] = useState<any>(null);

  const t = translations[currentLanguage];

  useEffect(() => {
    const storedState = typeof window !== 'undefined' ? localStorage.getItem('userState') : null;
    if (storedState) {
      setFormData(prev => ({ ...prev, state: storedState }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateRefund = () => {
    const income = parseFloat(formData.income) || 0;
    const federalWithholding = parseFloat(formData.federalWithholding) || 0;
    const stateWithholding = parseFloat(formData.stateWithholding) || 0;
    const dependents = parseInt(formData.dependents) || 0;
    const stateProfile = stateTaxProfiles[formData.state] || {
      name: formData.state ? US_STATES.find(s => s.code === formData.state)?.name || 'State' : 'State',
      rate: 0.04,
      deduction: 4000,
      highlights: [
        'Standard deduction or personal exemption lowers taxable income.',
        'State credits can reduce liability depending on eligibility.',
        'Your withholding compared to liability drives refund or balance due.'
      ]
    };
    
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

    const stateTaxableIncome = Math.max(0, income - stateProfile.deduction);
    const stateTax = stateProfile.rate > 0 ? parseFloat((stateTaxableIncome * stateProfile.rate).toFixed(2)) : 0;
    const stateRefundOrOwed = stateWithholding - stateTax;

    setResults({
      grossIncome: income,
      adjustedGrossIncome: income,
      standardDeduction: deductions,
      taxableIncome,
      federalTax: totalTax,
      childTaxCredit,
      totalWithholding: federalWithholding,
      refundOrOwed,
      effectiveTaxRate: income > 0 ? (totalTax / income * 100) : 0,
      stateTax,
      stateRefundOrOwed,
      stateWithholding,
      stateProfile
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
                    State of residence
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select your state</option>
                    {US_STATES.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Used for state tax estimates and mailing guidance.</p>
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
                    State withholding (if any)
                  </label>
                  <input
                    type="number"
                    name="stateWithholding"
                    value={formData.stateWithholding}
                    onChange={handleInputChange}
                    placeholder="2500"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Federal Tax Summary</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Based on your income, deductions, and credits, your estimated federal {results.refundOrOwed >= 0 ? 'refund' : 'amount due'} is ${Math.abs(results.refundOrOwed).toLocaleString()}.
                        </p>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start">
                            <i className="ri-checkbox-circle-line text-blue-600 mr-2 mt-0.5"></i>
                            <span>Standard deduction applied: ${results.standardDeduction.toLocaleString()}.</span>
                          </li>
                          <li className="flex items-start">
                            <i className="ri-checkbox-circle-line text-blue-600 mr-2 mt-0.5"></i>
                            <span>{results.childTaxCredit > 0 ? `Child tax credit lowered federal liability by $${results.childTaxCredit.toLocaleString()}.` : 'No child tax credit was applied based on your entries.'}</span>
                          </li>
                          <li className="flex items-start">
                            <i className="ri-checkbox-circle-line text-blue-600 mr-2 mt-0.5"></i>
                            <span>Estimated federal tax after credits: ${results.federalTax.toLocaleString()} using current brackets.</span>
                          </li>
                          <li className="flex items-start">
                            <i className="ri-checkbox-circle-line text-blue-600 mr-2 mt-0.5"></i>
                            <span>Effective federal rate: {results.effectiveTaxRate.toFixed(2)}%.</span>
                          </li>
                          <li className="flex items-start">
                            <i className="ri-checkbox-circle-line text-blue-600 mr-2 mt-0.5"></i>
                            <span>This information is for general guidance and is not legal advice.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">State Tax Summary for {results.stateProfile?.name || 'Your State'}</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          Estimated state {results.stateRefundOrOwed >= 0 ? 'refund' : 'amount due'}: ${Math.abs(results.stateRefundOrOwed).toLocaleString()}.
                        </p>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start">
                            <i className="ri-checkbox-circle-line text-green-600 mr-2 mt-0.5"></i>
                            <span>State taxable income after deductions: ${Math.max(0, (parseFloat(formData.income) || 0) - (results.stateProfile?.deduction || 0)).toLocaleString()}.</span>
                          </li>
                          <li className="flex items-start">
                            <i className="ri-checkbox-circle-line text-green-600 mr-2 mt-0.5"></i>
                            <span>Estimated state tax: ${results.stateTax.toLocaleString()} with withholding of ${results.stateWithholding.toLocaleString()}.</span>
                          </li>
                          {(results.stateProfile?.highlights || []).slice(0, 3).map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start">
                              <i className="ri-checkbox-circle-line text-green-600 mr-2 mt-0.5"></i>
                              <span>{item}</span>
                            </li>
                          ))}
                          <li className="flex items-start">
                            <i className="ri-information-line text-yellow-600 mr-2 mt-0.5"></i>
                            <span>This guidance updates whenever your data or state selection changes.</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mt-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                        <i className="ri-refund-line text-green-600 mr-2"></i>
                        Refund Suggestion / Explanation
                      </h4>
                      <p className="text-sm text-gray-700 mb-3">
                        {results.refundOrOwed >= 0
                          ? 'You are on track for a refund because your withholding exceeds your estimated federal liability.'
                          : 'You may owe tax because your withholding is below your estimated liability.'}
                      </p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start">
                          <i className="ri-arrow-right-line text-blue-600 mr-2 mt-0.5"></i>
                          <span>Federal withholding: ${results.totalWithholding.toLocaleString()} vs. estimated tax: ${results.federalTax.toLocaleString()}.</span>
                        </li>
                        <li className="flex items-start">
                          <i className="ri-arrow-right-line text-blue-600 mr-2 mt-0.5"></i>
                          <span>State withholding: ${results.stateWithholding.toLocaleString()} vs. estimated state tax: ${results.stateTax.toLocaleString()}.</span>
                        </li>
                        <li className="flex items-start">
                          <i className="ri-arrow-right-line text-blue-600 mr-2 mt-0.5"></i>
                          <span>Main drivers: {results.childTaxCredit > 0 ? 'child tax credit applied, ' : ''}standard deduction of ${results.standardDeduction.toLocaleString()}, and your withholding amounts.</span>
                        </li>
                      </ul>
                      <p className="text-xs text-gray-600 mt-3">
                        These summaries use the TaxAIHelp tax & benefits engine for quick guidance and update when you change your inputs.
                      </p>
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
