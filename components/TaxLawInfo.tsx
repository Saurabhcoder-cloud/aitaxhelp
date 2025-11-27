'use client';

import { useState } from 'react';

interface TaxLawInfoProps {
  selectedState: string;
}

const stateTaxInfo: { [key: string]: { rate: string; info: string } } = {
  AL: { rate: "2% - 5%", info: "Alabama has a progressive income tax with rates from 2% to 5%. Standard deduction available." },
  AK: { rate: "0%", info: "Alaska has no state income tax. Only local taxes may apply in some areas." },
  AZ: { rate: "2.59% - 4.5%", info: "Arizona has a progressive income tax. Various credits available for education and charitable contributions." },
  AR: { rate: "2% - 5.5%", info: "Arkansas has a progressive income tax system with multiple brackets." },
  CA: { rate: "1% - 13.3%", info: "California has the highest state income tax rates. Many deductions and credits available." },
  CO: { rate: "4.4%", info: "Colorado has a flat income tax rate. Standard and itemized deductions available." },
  CT: { rate: "3% - 6.99%", info: "Connecticut has a progressive income tax with various credits for property tax and earned income." },
  DE: { rate: "2.2% - 6.6%", info: "Delaware has a progressive income tax system with standard deduction options." },
  FL: { rate: "0%", info: "Florida has no state income tax. No state tax return required." },
  GA: { rate: "1% - 5.75%", info: "Georgia has a progressive income tax with standard and itemized deduction options." },
  HI: { rate: "1.4% - 11%", info: "Hawaii has a progressive income tax with high top rates. Various credits available." },
  ID: { rate: "1% - 6%", info: "Idaho has a progressive income tax system based on federal taxable income." },
  IL: { rate: "4.95%", info: "Illinois has a flat income tax rate. Standard exemption amounts available." },
  IN: { rate: "3.15%", info: "Indiana has a flat state income tax rate plus county taxes." },
  IA: { rate: "0.33% - 8.53%", info: "Iowa has a progressive income tax with federal deduction allowed." },
  KS: { rate: "3.1% - 5.7%", info: "Kansas has a progressive income tax system with standard deduction." },
  KY: { rate: "4.5%", info: "Kentucky has a flat income tax rate. Standard deduction available." },
  LA: { rate: "1.85% - 4.25%", info: "Louisiana has a progressive income tax with federal deduction allowed." },
  ME: { rate: "5.8% - 7.15%", info: "Maine has a progressive income tax system with various credits." },
  MD: { rate: "2% - 5.75%", info: "Maryland has a progressive income tax plus local county taxes." },
  MA: { rate: "5%", info: "Massachusetts has a flat income tax rate. Various deductions and exemptions available." },
  MI: { rate: "4.25%", info: "Michigan has a flat income tax rate with standard deduction and exemptions." },
  MN: { rate: "5.35% - 9.85%", info: "Minnesota has a progressive income tax with various credits and deductions." },
  MS: { rate: "0% - 5%", info: "Mississippi has a progressive income tax system with standard deduction." },
  MO: { rate: "1.5% - 5.3%", info: "Missouri has a progressive income tax with federal deduction allowed." },
  MT: { rate: "1% - 6.75%", info: "Montana has a progressive income tax system with various credits." },
  NE: { rate: "2.46% - 6.84%", info: "Nebraska has a progressive income tax based on federal adjusted gross income." },
  NV: { rate: "0%", info: "Nevada has no state income tax. No state tax return required." },
  NH: { rate: "0%", info: "New Hampshire has no earned income tax. Only dividends and interest taxed at 5%." },
  NJ: { rate: "1.4% - 10.75%", info: "New Jersey has a progressive income tax with various credits and deductions." },
  NM: { rate: "1.7% - 5.9%", info: "New Mexico has a progressive income tax system with standard deduction." },
  NY: { rate: "4% - 10.9%", info: "New York has a progressive income tax plus local city taxes in some areas." },
  NC: { rate: "4.75%", info: "North Carolina has a flat income tax rate. Standard deduction available." },
  ND: { rate: "1.1% - 2.9%", info: "North Dakota has a progressive income tax with relatively low rates." },
  OH: { rate: "0% - 3.99%", info: "Ohio has a progressive income tax system with various credits." },
  OK: { rate: "0.25% - 4.75%", info: "Oklahoma has a progressive income tax with standard deduction." },
  OR: { rate: "4.75% - 9.9%", info: "Oregon has a progressive income tax with no sales tax." },
  PA: { rate: "3.07%", info: "Pennsylvania has a flat income tax rate. No standard deduction." },
  RI: { rate: "3.75% - 5.99%", info: "Rhode Island has a progressive income tax system." },
  SC: { rate: "0% - 6.5%", info: "South Carolina has a progressive income tax with standard deduction." },
  SD: { rate: "0%", info: "South Dakota has no state income tax. No state tax return required." },
  TN: { rate: "0%", info: "Tennessee has no state income tax. No state tax return required." },
  TX: { rate: "0%", info: "Texas has no state income tax. No state tax return required." },
  UT: { rate: "4.85%", info: "Utah has a flat income tax rate with various credits available." },
  VT: { rate: "3.35% - 8.75%", info: "Vermont has a progressive income tax system." },
  VA: { rate: "2% - 5.75%", info: "Virginia has a progressive income tax with standard deduction." },
  WA: { rate: "0%", info: "Washington has no state income tax. No state tax return required." },
  WV: { rate: "3% - 6.5%", info: "West Virginia has a progressive income tax system." },
  WI: { rate: "3.54% - 7.65%", info: "Wisconsin has a progressive income tax with various credits." },
  WY: { rate: "0%", info: "Wyoming has no state income tax. No state tax return required." }
};

const federalTaxInfo = {
  brackets2024: [
    { rate: "10%", single: "$0 - $11,600", married: "$0 - $23,200" },
    { rate: "12%", single: "$11,601 - $47,150", married: "$23,201 - $94,300" },
    { rate: "22%", single: "$47,151 - $100,525", married: "$94,301 - $201,050" },
    { rate: "24%", single: "$100,526 - $191,950", married: "$201,051 - $383,900" },
    { rate: "32%", single: "$191,951 - $243,725", married: "$383,901 - $487,450" },
    { rate: "35%", single: "$243,726 - $609,350", married: "$487,451 - $731,200" },
    { rate: "37%", single: "$609,351+", married: "$731,201+" }
  ],
  standardDeduction: {
    single: "$14,600",
    married: "$29,200",
    headOfHousehold: "$21,900"
  }
};

export default function TaxLawInfo({ selectedState }: TaxLawInfoProps) {
  const [activeTab, setActiveTab] = useState<'federal' | 'state'>('federal');
  
  const stateInfo = stateTaxInfo[selectedState] || { rate: "N/A", info: "Please select a state to view tax information." };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Tax Law Information</h3>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('federal')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeTab === 'federal'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Federal Tax Laws
        </button>
        <button
          onClick={() => setActiveTab('state')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeTab === 'state'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          State Tax Laws ({selectedState || 'Select State'})
        </button>
      </div>

      {activeTab === 'federal' ? (
        <div>
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i className="ri-government-line mr-2 text-blue-600"></i>
              2024 Federal Income Tax Brackets
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Tax Rate</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Single Filers</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Married Filing Jointly</th>
                  </tr>
                </thead>
                <tbody>
                  {federalTaxInfo.brackets2024.map((bracket, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium text-blue-600">{bracket.rate}</td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">{bracket.single}</td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">{bracket.married}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <i className="ri-file-list-3-line mr-2 text-blue-600"></i>
              2024 Standard Deduction
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Single</p>
                <p className="text-2xl font-bold text-blue-600">{federalTaxInfo.standardDeduction.single}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Married Filing Jointly</p>
                <p className="text-2xl font-bold text-blue-600">{federalTaxInfo.standardDeduction.married}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Head of Household</p>
                <p className="text-2xl font-bold text-blue-600">{federalTaxInfo.standardDeduction.headOfHousehold}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <i className="ri-information-line mr-2 text-blue-600"></i>
              Key Federal Tax Information
            </h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <i className="ri-checkbox-circle-fill text-green-500 mr-2 mt-1"></i>
                <span>Filing deadline: April 15, 2025 (or next business day)</span>
              </li>
              <li className="flex items-start">
                <i className="ri-checkbox-circle-fill text-green-500 mr-2 mt-1"></i>
                <span>Common deductions: Mortgage interest, charitable contributions, medical expenses (over 7.5% AGI)</span>
              </li>
              <li className="flex items-start">
                <i className="ri-checkbox-circle-fill text-green-500 mr-2 mt-1"></i>
                <span>Tax credits: Child Tax Credit, Earned Income Tax Credit, Education Credits</span>
              </li>
              <li className="flex items-start">
                <i className="ri-checkbox-circle-fill text-green-500 mr-2 mt-1"></i>
                <span>Retirement contributions: Traditional IRA, 401(k) contributions may reduce taxable income</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <i className="ri-map-pin-line mr-2 text-blue-600"></i>
              {selectedState ? `${selectedState} State Tax Information` : 'Select a State'}
            </h4>
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">State Income Tax Rate</p>
              <p className="text-2xl font-bold text-blue-600">{stateInfo.rate}</p>
            </div>
            <p className="text-gray-700">{stateInfo.info}</p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
            <div className="flex items-start">
              <i className="ri-alert-line text-yellow-600 text-xl mr-3 mt-1"></i>
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Important Note</h5>
                <p className="text-gray-700 text-sm">
                  This information is provided as general guidance only and should not be considered personal tax advice. 
                  Tax laws change frequently. Please verify current rates and rules on your state's official tax authority 
                  website and the IRS website before filing your return.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
