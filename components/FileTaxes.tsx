'use client';

import { useState } from 'react';

export default function FileTaxes() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const steps = [
    { id: 1, title: 'Personal Information', icon: 'ri-user-line' },
    { id: 2, title: 'Upload Documents', icon: 'ri-upload-line' },
    { id: 3, title: 'Review & Submit', icon: 'ri-check-line' },
  ];

  const handleFileUpload = (fileName: string) => {
    setUploadedFiles(prev => [...prev, fileName]);
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <div className="w-6 h-6 flex items-center justify-center mr-3 text-blue-600">
          <i className="ri-file-text-line"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-800">File Your Taxes</h3>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className={step.icon}></i>
                </div>
              </div>
              <span className={`ml-2 text-sm ${
                currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-64">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 mb-4">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Social Security Number</label>
                <input
                  type="text"
                  placeholder="XXX-XX-XXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filing Status</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-8">
                  <option>Single</option>
                  <option>Married Filing Jointly</option>
                  <option>Head of Household</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 mb-4">Upload Tax Documents</h4>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 text-gray-400">
                <i className="ri-upload-cloud-line text-3xl"></i>
              </div>
              <p className="text-gray-600 mb-2">Drag and drop your tax documents here</p>
              <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
              <button
                onClick={() => handleFileUpload('W-2_Form.pdf')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Choose Files
              </button>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-700 mb-2">Uploaded Files:</h5>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-5 h-5 flex items-center justify-center mr-3 text-green-600">
                          <i className="ri-file-check-line"></i>
                        </div>
                        <span className="text-sm text-gray-700">{file}</span>
                      </div>
                      <button className="text-red-500 hover:text-red-700">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-delete-bin-line"></i>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 mb-4">Review & Submit</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-700 mb-3">Tax Return Summary</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Filing Status:</span>
                  <span className="text-gray-800">Single</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documents Uploaded:</span>
                  <span className="text-gray-800">{uploadedFiles.length} files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Refund:</span>
                  <span className="text-green-600 font-semibold">$2,450</span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="w-5 h-5 flex items-center justify-center mr-3 text-blue-600 mt-0.5">
                  <i className="ri-information-line"></i>
                </div>
                <div>
                  <p className="text-sm text-blue-800">
                    By submitting this tax return, you agree to our terms and conditions. 
                    Your information will be securely processed and filed with the IRS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Previous
        </button>
        
        {currentStep < 3 ? (
          <button
            onClick={nextStep}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Next Step
          </button>
        ) : (
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">
            Submit Tax Return
          </button>
        )}
      </div>
    </div>
  );
}