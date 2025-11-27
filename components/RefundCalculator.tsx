'use client';

import { useState } from 'react';

export default function RefundCalculator() {
  const [income, setIncome] = useState('');
  const [deductions, setDeductions] = useState('');
  const [filingStatus, setFilingStatus] = useState('single');
  const [result, setResult] = useState<{refund: number, tax: number} | null>(null);

  const calculateRefund = () => {
    const grossIncome = parseFloat(income) || 0;
    const totalDeductions = parseFloat(deductions) || 0;
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);
    
    let tax = 0;
    const brackets = filingStatus === 'single' 
      ? [[0, 0.10], [11000, 0.12], [44725, 0.22], [95375, 0.24], [182050, 0.32], [231250, 0.35], [578125, 0.37]]
      : [[0, 0.10], [22000, 0.12], [89450, 0.22], [190750, 0.24], [364200, 0.32], [462500, 0.35], [693750, 0.37]];
    
    let remainingIncome = taxableIncome;
    for (let i = 0; i < brackets.length; i++) {
      const [threshold, rate] = brackets[i];
      const nextThreshold = i < brackets.length - 1 ? brackets[i + 1][0] : Infinity;
      const taxableAtThisRate = Math.min(remainingIncome, nextThreshold - threshold);
      
      if (taxableAtThisRate > 0) {
        tax += taxableAtThisRate * rate;
        remainingIncome -= taxableAtThisRate;
      }
      
      if (remainingIncome <= 0) break;
    }
    
    const estimatedWithholding = grossIncome * 0.15;
    const refund = Math.max(0, estimatedWithholding - tax);
    
    setResult({ refund, tax });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <div className="w-6 h-6 flex items-center justify-center mr-3 text-blue-600">
          <i className="ri-calculator-line"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-800">Tax Refund Calculator</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Income ($)
            </label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="Enter your annual income"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Deductions ($)
            </label>
            <input
              type="number"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              placeholder="Enter total deductions"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filing Status
            </label>
            <select
              value={filingStatus}
              onChange={(e) => setFilingStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-8"
            >
              <option value="single">Single</option>
              <option value="married">Married Filing Jointly</option>
              <option value="head">Head of Household</option>
            </select>
          </div>

          <button
            onClick={calculateRefund}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Calculate Refund
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-4">Calculation Results</h4>
          
          {result ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-gray-600">Estimated Tax:</span>
                <span className="font-semibold text-red-600">${result.tax.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-gray-600">Expected Refund:</span>
                <span className="font-bold text-green-600 text-lg">${result.refund.toLocaleString()}</span>
              </div>
              
              <div className="text-xs text-gray-500 mt-4">
                * This is an estimate based on 2024 tax brackets. Actual refund may vary based on additional factors.
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 text-gray-400">
                <i className="ri-calculator-line text-2xl"></i>
              </div>
              <p>Enter your information to calculate your estimated tax refund</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}