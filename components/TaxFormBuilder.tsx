
'use client';

import { useState } from 'react';
import { translations } from '@/lib/translations';

interface TaxFormBuilderProps {
  currentLanguage: string;
}

export default function TaxFormBuilder({ currentLanguage }: TaxFormBuilderProps) {
  const [selectedForm, setSelectedForm] = useState('1040');
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    ssn: '***-**-1234',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    filingStatus: 'single',
    wages: '65000',
    federalTaxWithheld: '8500',
    standardDeduction: '13850'
  });

  const t = translations[currentLanguage];

  const forms = [
    { id: '1040', name: 'Form 1040', description: t.fileTaxes.form1040Desc },
    { id: '1040EZ', name: 'Form 1040EZ', description: t.fileTaxes.form1040EZDesc },
    { id: '1040A', name: 'Form 1040A', description: t.fileTaxes.form1040ADesc }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveAsDraft = () => {
    // Save form data to localStorage
    const draftData = {
      selectedForm,
      formData,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('taxFormDraft', JSON.stringify(draftData));
    
    // Show success message
    setShowSaveMessage(true);
    setTimeout(() => {
      setShowSaveMessage(false);
    }, 3000);
  };

  const generatePDF = () => {
    // Simulate PDF generation
    const link = document.createElement('a');
    link.href = '#';
    link.download = `${selectedForm}_${formData.firstName}_${formData.lastName}.pdf`;
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Success Message */}
      {showSaveMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <i className="ri-check-line text-green-600 text-xl"></i>
            <div>
              <p className="font-medium text-green-800">Draft Saved Successfully!</p>
              <p className="text-sm text-green-600">Your tax form has been saved and you can continue later.</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.fileTaxes.selectForm}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedForm === form.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setSelectedForm(form.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedForm === form.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedForm === form.id && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{form.name}</p>
                  <p className="text-sm text-gray-600">{form.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">{selectedForm} - {t.fileTaxes.formPreview}</h3>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">
              <i className="ri-eye-line mr-2"></i>
              {t.fileTaxes.preview}
            </button>
            <button 
              onClick={generatePDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-download-line mr-2"></i>
              {t.fileTaxes.downloadPDF}
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">{t.fileTaxes.personalInfo}</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.fileTaxes.firstName}
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.fileTaxes.lastName}
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.fileTaxes.ssn}
              </label>
              <input
                type="text"
                value={formData.ssn}
                onChange={(e) => handleInputChange('ssn', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.fileTaxes.address}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.fileTaxes.city}
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.fileTaxes.state}
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.fileTaxes.zipCode}
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">{t.fileTaxes.incomeInfo}</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.fileTaxes.filingStatus}
              </label>
              <div className="relative">
                <select
                  value={formData.filingStatus}
                  onChange={(e) => handleInputChange('filingStatus', e.target.value)}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="single">Single</option>
                  <option value="married-joint">Married Filing Jointly</option>
                  <option value="married-separate">Married Filing Separately</option>
                  <option value="head-household">Head of Household</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.fileTaxes.wages}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  value={formData.wages}
                  onChange={(e) => handleInputChange('wages', e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.fileTaxes.federalTaxWithheld}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  value={formData.federalTaxWithheld}
                  onChange={(e) => handleInputChange('federalTaxWithheld', e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.fileTaxes.standardDeduction}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  value={formData.standardDeduction}
                  onChange={(e) => handleInputChange('standardDeduction', e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <i className="ri-save-line"></i>
            <span>{t.fileTaxes.autoSaved}</span>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={saveAsDraft}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.fileTaxes.saveAsDraft}
            </button>
            <button 
              onClick={generatePDF}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-download-line mr-2"></i>
              {t.fileTaxes.generateForm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
