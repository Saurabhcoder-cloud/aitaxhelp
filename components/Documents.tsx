
'use client';

import { useState } from 'react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'processed' | 'pending' | 'error';
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'W-2_Form_2024.pdf',
      type: 'W-2',
      size: '2.4 MB',
      uploadDate: '2024-01-15',
      status: 'processed'
    },
    {
      id: '2',
      name: '1099_INT_Bank.pdf',
      type: '1099-INT',
      size: '1.8 MB',
      uploadDate: '2024-01-20',
      status: 'processed'
    },
    {
      id: '3',
      name: 'Receipt_Medical.jpg',
      type: 'Receipt',
      size: '0.9 MB',
      uploadDate: '2024-01-25',
      status: 'pending'
    }
  ]);

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      if (file.size <= 10 * 1024 * 1024) {
        const newDoc: Document = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type.includes('pdf') ? 'PDF' : 'Image',
          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
          uploadDate: new Date().toISOString().split('T')[0],
          status: 'pending'
        };
        setDocuments(prev => [...prev, newDoc]);
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return 'ri-check-line';
      case 'pending': return 'ri-time-line';
      case 'error': return 'ri-error-warning-line';
      default: return 'ri-file-line';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tax Documents</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
          <i className="ri-upload-line mr-2"></i>
          Upload New
        </button>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <i className="ri-upload-cloud-2-line text-4xl text-gray-400"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Drag and drop your tax documents
        </h3>
        <p className="text-gray-600 mb-4">
          or click to browse files (PDF, JPG, PNG up to 10MB)
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          id="file-upload"
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        />
        <label
          htmlFor="file-upload"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
        >
          Choose Files
        </label>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Uploaded Documents</h3>
        </div>
        <div className="divide-y">
          {documents.map((doc) => (
            <div key={doc.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-file-text-line text-blue-600"></i>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{doc.name}</h4>
                  <p className="text-sm text-gray-600">
                    {doc.type} • {doc.size} • Uploaded {doc.uploadDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                  <i className={`${getStatusIcon(doc.status)} mr-1`}></i>
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
                <div className="flex space-x-2">
                  <button className="text-gray-400 hover:text-blue-600 transition-colors">
                    <i className="ri-download-line"></i>
                  </button>
                  <button className="text-gray-400 hover:text-red-600 transition-colors">
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">W-2 Forms</h4>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-text-line text-green-600"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">2</p>
          <p className="text-sm text-gray-600">Documents uploaded</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">1099 Forms</h4>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-list-line text-blue-600"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">1</p>
          <p className="text-sm text-gray-600">Documents uploaded</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Receipts</h4>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="ri-receipt-line text-purple-600"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">5</p>
          <p className="text-sm text-gray-600">Documents uploaded</p>
        </div>
      </div>
    </div>
  );
}
