
'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FileUpload from '@/components/FileUpload';
import TaxFormBuilder from '@/components/TaxFormBuilder';
import StateSelector from '@/components/StateSelector';
import TaxLawGuidance from '@/components/TaxLawGuidance';
import { translations } from '@/lib/translations';
import { irsMailingAddresses, stateMailingAddresses } from '@/components/MailingAddressInfo';

export default function FileTaxesPage() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedState, setSelectedState] = useState('');

  const t = translations[currentLanguage];
  const stateAddressInfo = selectedState ? stateMailingAddresses[selectedState] : null;
  const irsAddress = selectedState ? irsMailingAddresses[selectedState] : null;

  useEffect(() => {
    const savedState = typeof window !== 'undefined' ? localStorage.getItem('userState') : null;
    if (savedState) {
      setSelectedState(savedState);
    }
  }, []);

  const steps = [
    { id: 1, title: t.fileTaxes.uploadDocuments, icon: 'ri-upload-cloud-line' },
    { id: 2, title: t.fileTaxes.reviewData, icon: 'ri-eye-line' },
    { id: 3, title: t.fileTaxes.calculateTaxes, icon: 'ri-calculator-line' },
    { id: 4, title: t.fileTaxes.reviewReturn, icon: 'ri-file-text-line' },
    { id: 5, title: t.fileTaxes.submitReturn, icon: 'ri-send-plane-line' }
  ];

  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} />
      
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.fileTaxes.title}</h1>
            <p className="text-xl text-gray-600">{t.fileTaxes.subtitle}</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                    currentStep >= step.id 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <i className={`${step.icon} text-xl`}></i>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              {steps.map((step) => (
                <div key={step.id} className="text-center">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {currentStep === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.fileTaxes.uploadDocuments}</h2>
                
                {/* State Selection */}
                <div className="mb-8">
                  <StateSelector 
                    selectedState={selectedState}
                    onStateChange={setSelectedState}
                    currentLanguage={currentLanguage}
                  />
                </div>

                <FileUpload onFileUpload={handleFileUpload} currentLanguage={currentLanguage} />
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.fileTaxes.uploadedFiles}</h3>
                    <div className="space-y-3">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <i className="ri-file-text-line text-2xl text-blue-600"></i>
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                              {t.fileTaxes.processed}
                            </span>
                            <button 
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete file"
                            >
                              <i className="ri-delete-bin-line text-lg"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tax Law Guidance */}
                {selectedState && (
                  <div className="mt-8">
                    <TaxLawGuidance 
                      selectedState={selectedState}
                      currentLanguage={currentLanguage}
                    />
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.fileTaxes.reviewData}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">{t.fileTaxes.personalInfo}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.fileTaxes.fullName}:</span>
                        <span className="font-medium">John Doe</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.fileTaxes.ssn}:</span>
                        <span className="font-medium">***-**-1234</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.fileTaxes.filingStatus}:</span>
                        <span className="font-medium">Single</span>
                      </div>
                      {selectedState && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">State:</span>
                          <span className="font-medium">{selectedState}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">{t.fileTaxes.incomeInfo}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.fileTaxes.wages}:</span>
                        <span className="font-medium">$65,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.fileTaxes.federalTaxWithheld}:</span>
                        <span className="font-medium">$8,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.fileTaxes.standardDeduction}:</span>
                        <span className="font-medium">$13,850</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.fileTaxes.calculateTaxes}</h2>
                
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <i className="ri-information-line text-yellow-600 text-xl mt-0.5"></i>
                    <div>
                      <h5 className="font-semibold text-yellow-800">Tax Calculation Notice</h5>
                      <p className="text-yellow-700 text-sm mt-1">
                        The AI provides tax calculations based on current tax laws and your provided information. 
                        Refund estimates are only provided when specifically requested and are for guidance purposes only.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{t.fileTaxes.taxCalculation}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">{t.fileTaxes.totalIncome}</p>
                        <p className="text-2xl font-bold text-gray-900">$65,000</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">{t.fileTaxes.taxOwed}</p>
                        <p className="text-2xl font-bold text-red-600">$6,200</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Tax Withheld</p>
                        <p className="text-2xl font-bold text-blue-600">$8,500</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t.fileTaxes.taxBreakdown}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span>{t.fileTaxes.adjustedGrossIncome}</span>
                      <span className="font-medium">$65,000</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span>{t.fileTaxes.standardDeduction}</span>
                      <span className="font-medium">-$14,600</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span>{t.fileTaxes.taxableIncome}</span>
                      <span className="font-medium">$50,400</span>
                    </div>
                    <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-semibold">{t.fileTaxes.federalTax}</span>
                      <span className="font-semibold">$6,200</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.fileTaxes.reviewReturn}</h2>
                <TaxFormBuilder currentLanguage={currentLanguage} />
              </div>
            )}

            {currentStep === 5 && (
              <div className="text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-check-line text-4xl text-green-600"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.fileTaxes.readyToSubmit}</h2>
                <p className="text-gray-600 mb-8">{t.fileTaxes.submitMessage}</p>
                
                {/* Submission Addresses */}
                {selectedState && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <i className="ri-government-line text-blue-600 text-2xl"></i>
                        <h3 className="font-semibold text-blue-800">Federal Tax Return</h3>
                      </div>
                      <p className="text-sm text-blue-700 font-mono leading-relaxed">
                        {irsAddress || 'Select your state to view the correct IRS mailing address.'}
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <i className="ri-map-pin-line text-green-600 text-2xl"></i>
                        <h3 className="font-semibold text-green-800">State Tax Return ({selectedState})</h3>
                      </div>
                      <p className="text-sm text-green-700 font-mono leading-relaxed">
                        {stateAddressInfo ? stateAddressInfo.address : 'State tax office address will be provided based on your selected state'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <i className="ri-alert-line text-yellow-600 mr-2"></i>
                    Verify Before Mailing
                  </h4>
                  <p className="text-sm text-gray-700">
                    Always double-check the mailing address on the official IRS/state website before sending.
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <i className="ri-information-line text-yellow-600 text-xl mt-0.5"></i>
                    <div className="text-left">
                      <h3 className="font-semibold text-yellow-800">{t.fileTaxes.importantNotice}</h3>
                      <p className="text-yellow-700 text-sm mt-1">{t.fileTaxes.submitNotice}</p>
                    </div>
                  </div>
                </div>

                <button className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 whitespace-nowrap">
                  <i className="ri-send-plane-line mr-2"></i>
                  {t.fileTaxes.submitTaxReturn}
                </button>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <i className="ri-arrow-left-line mr-2"></i>
                {t.fileTaxes.previous}
              </button>

              <button
                onClick={nextStep}
                disabled={currentStep === steps.length || (currentStep === 1 && !selectedState)}
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap ${
                  currentStep === steps.length || (currentStep === 1 && !selectedState)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {currentStep === steps.length ? t.fileTaxes.complete : t.fileTaxes.next}
                {currentStep < steps.length && <i className="ri-arrow-right-line ml-2"></i>}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer currentLanguage={currentLanguage} />
    </div>
  );
}
