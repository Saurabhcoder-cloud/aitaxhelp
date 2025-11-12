
'use client';

import { useState } from 'react';

interface TaxLawGuidanceProps {
  selectedState: string;
  currentLanguage: string;
}

const stateTaxLaws = {
  'CA': {
    name: 'California',
    laws: [
      'California Personal Income Tax Rate: 1% - 13.3%',
      'Standard Deduction: $5,202 (Single), $10,404 (Married Filing Jointly)',
      'State Disability Insurance (SDI): 0.9% on wages up to $153,164',
      'California requires e-filing for tax preparers who prepare 100+ returns'
    ],
    submissionAddress: 'Franchise Tax Board, PO Box 942840, Sacramento, CA 94240-0040'
  },
  'NY': {
    name: 'New York',
    laws: [
      'New York State Income Tax Rate: 4% - 10.9%',
      'Standard Deduction: $8,000 (Single), $16,050 (Married Filing Jointly)',
      'NYC residents pay additional city tax: 3.078% - 3.876%',
      'New York requires electronic filing for most returns'
    ],
    submissionAddress: 'NYS Tax Department, Processing Center, PO Box 61000, Albany, NY 12261-0001'
  },
  'TX': {
    name: 'Texas',
    laws: [
      'Texas has no state personal income tax',
      'No state tax return filing required for individuals',
      'Sales tax rate varies by location: 6.25% - 8.25%',
      'Property taxes are collected at local level'
    ],
    submissionAddress: 'No state income tax return required'
  },
  'FL': {
    name: 'Florida',
    laws: [
      'Florida has no state personal income tax',
      'No state tax return filing required for individuals',
      'Sales tax rate: 6% plus local taxes',
      'Intangible personal property tax was repealed in 2007'
    ],
    submissionAddress: 'No state income tax return required'
  }
};

const federalTaxLaws = [
  'Federal Income Tax Brackets for 2024: 10%, 12%, 22%, 24%, 32%, 35%, 37%',
  'Standard Deduction 2024: $14,600 (Single), $29,200 (Married Filing Jointly)',
  'Personal Exemption: Suspended through 2025 under TCJA',
  'Child Tax Credit: Up to $2,000 per qualifying child',
  'Earned Income Tax Credit: Available for low to moderate income taxpayers',
  'IRA Contribution Limits: $7,000 ($8,000 if age 50+)',
  '401(k) Contribution Limits: $23,000 ($30,500 if age 50+)'
];

const federalSubmissionAddress = 'Internal Revenue Service, 1973 N Rulon White Blvd, Ogden, UT 84404';

export default function TaxLawGuidance({ selectedState, currentLanguage }: TaxLawGuidanceProps) {
  const [activeTab, setActiveTab] = useState<'federal' | 'state'>('federal');
  
  const stateInfo = stateTaxLaws[selectedState as keyof typeof stateTaxLaws];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Tax Law Guidance</h3>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('federal')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'federal'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Federal Tax Laws
        </button>
        <button
          onClick={() => setActiveTab('state')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'state'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {stateInfo ? `${stateInfo.name} State Laws` : 'State Tax Laws'}
        </button>
      </div>

      {/* Federal Tax Laws */}
      {activeTab === 'federal' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <i className="ri-government-line text-2xl text-blue-600"></i>
            <h4 className="text-xl font-semibold text-gray-900">Federal Tax Information</h4>
          </div>
          
          <div className="space-y-3">
            {federalTaxLaws.map((law, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <i className="ri-checkbox-circle-line text-blue-600 mt-0.5"></i>
                <p className="text-gray-700 text-sm">{law}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-semibold text-gray-900 mb-2">Federal Tax Return Submission Address:</h5>
            <p className="text-gray-700 text-sm">{federalSubmissionAddress}</p>
          </div>
        </div>
      )}

      {/* State Tax Laws */}
      {activeTab === 'state' && (
        <div className="space-y-4">
          {stateInfo ? (
            <>
              <div className="flex items-center space-x-2 mb-4">
                <i className="ri-map-pin-line text-2xl text-green-600"></i>
                <h4 className="text-xl font-semibold text-gray-900">{stateInfo.name} Tax Information</h4>
              </div>
              
              <div className="space-y-3">
                {stateInfo.laws.map((law, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <i className="ri-checkbox-circle-line text-green-600 mt-0.5"></i>
                    <p className="text-gray-700 text-sm">{law}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-semibold text-gray-900 mb-2">State Tax Return Submission Address:</h5>
                <p className="text-gray-700 text-sm">{stateInfo.submissionAddress}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <i className="ri-information-line text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">Please select a state to view specific tax law information.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <i className="ri-alert-line text-yellow-600 text-xl mt-0.5"></i>
          <div>
            <h5 className="font-semibold text-yellow-800">Important Notice</h5>
            <p className="text-yellow-700 text-sm mt-1">
              Tax laws change frequently. This information is for guidance only and should not replace professional tax advice. 
              Always consult current IRS publications and state tax authorities for the most up-to-date information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
