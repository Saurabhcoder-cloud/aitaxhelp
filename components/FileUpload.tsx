'use client';

import { useState, useCallback } from 'react';
import { translations } from '@/lib/translations';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  currentLanguage: string;
}

export default function FileUpload({ onFileUpload, currentLanguage }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const t = translations[currentLanguage];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/pdf' || 
                         file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length > 0) {
      setIsUploading(true);
      setTimeout(() => {
        onFileUpload(validFiles);
        setIsUploading(false);
      }, 1500);
    }
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/pdf' || 
                         file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length > 0) {
      setIsUploading(true);
      setTimeout(() => {
        onFileUpload(validFiles);
        setIsUploading(false);
      }, 1500);
    }
  }, [onFileUpload]);

  return (
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <div className="animate-spin">
                <i className="ri-loader-4-line text-2xl text-blue-600"></i>
              </div>
            </div>
            <p className="text-lg font-medium text-gray-900">{t.fileTaxes.processing}</p>
            <p className="text-gray-600">{t.fileTaxes.processingMessage}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <i className="ri-upload-cloud-2-line text-2xl text-blue-600"></i>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {t.fileTaxes.dragDropFiles}
              </p>
              <p className="text-gray-600 mb-4">{t.fileTaxes.supportedFormats}</p>
              <label className="inline-block">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap">
                  {t.fileTaxes.selectFiles}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <i className="ri-shield-check-line text-green-600"></i>
          </div>
          <div>
            <p className="font-medium text-green-800">{t.fileTaxes.secureUpload}</p>
            <p className="text-sm text-green-600">{t.fileTaxes.encryptedStorage}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <i className="ri-eye-line text-blue-600"></i>
          </div>
          <div>
            <p className="font-medium text-blue-800">{t.fileTaxes.ocrProcessing}</p>
            <p className="text-sm text-blue-600">{t.fileTaxes.autoExtraction}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <i className="ri-time-line text-purple-600"></i>
          </div>
          <div>
            <p className="font-medium text-purple-800">{t.fileTaxes.quickProcess}</p>
            <p className="text-sm text-purple-600">{t.fileTaxes.minutesToComplete}</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <i className="ri-information-line text-yellow-600 text-xl mt-0.5"></i>
          <div>
            <h3 className="font-semibold text-yellow-800">{t.fileTaxes.acceptedDocuments}</h3>
            <ul className="text-yellow-700 text-sm mt-2 space-y-1">
              <li>• W-2 Forms (Wage and Tax Statement)</li>
              <li>• 1099 Forms (Miscellaneous Income)</li>
              <li>• 1098 Forms (Mortgage Interest Statement)</li>
              <li>• Bank Statements</li>
              <li>• Receipt Images (Deductions)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}