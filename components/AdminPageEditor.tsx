
'use client';

import { useState } from 'react';

export default function AdminPageEditor() {
  const [selectedPage, setSelectedPage] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const pages = [
    { id: 'home', name: 'Home Page', path: '/' },
    { id: 'about', name: 'About Us', path: '/about' },
    { id: 'contact', name: 'Contact', path: '/contact' },
    { id: 'plans', name: 'Pricing Plans', path: '/plans' },
    { id: 'file-taxes', name: 'File Taxes', path: '/file-taxes' },
    { id: 'refund-calculator', name: 'Refund Calculator', path: '/refund-calculator' }
  ];

  const handlePageSelect = (pageId: string) => {
    setSelectedPage(pageId);
    const page = pages.find(p => p.id === pageId);
    if (page) {
      // Simulate loading page content
      setPageContent(`<!-- Content for ${page.name} -->
<div class="page-content">
  <h1>${page.name}</h1>
  <p>This is the content for ${page.name}. You can edit this content using the editor below.</p>
  
  <!-- Add your custom HTML, CSS, and content here -->
  <section class="hero-section">
    <div class="container">
      <h2>Welcome to ${page.name}</h2>
      <p>Edit this section to customize your page content.</p>
    </div>
  </section>
</div>`);
    }
  };

  const handleSave = () => {
    // Simulate saving page content
    if (!selectedPage) {
      alert('No page selected to save');
      return;
    }
    alert(`Page content for ${pages.find(p => p.id === selectedPage)?.name} has been saved successfully!`);
    setIsEditing(false);
  };

  const handlePreview = () => {
    // Simulate opening preview
    if (!selectedPage) {
      alert('No page selected to preview');
      return;
    }
    alert('Preview functionality would open the page in a new tab');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Page Editor</h2>
        {selectedPage && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreview}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-eye-line mr-2"></i>
              Preview
            </button>
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-save-line mr-2"></i>
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Page</h3>
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handlePageSelect(page.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedPage === page.id
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{page.name}</span>
                    <span className="text-xs text-gray-500">{page.path}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedPage ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Editing: {pages.find(p => p.id === selectedPage)?.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        isEditing
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isEditing ? 'View Mode' : 'Edit Mode'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Page Content (HTML)
                      </label>
                      <textarea
                        value={pageContent}
                        onChange={(e) => setPageContent(e.target.value)}
                        className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                        placeholder="Enter your HTML content here..."
                      />
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <i className="ri-information-line text-yellow-600 mr-2 mt-0.5"></i>
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">Editing Tips:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Use standard HTML tags and Tailwind CSS classes</li>
                            <li>Test your changes with the Preview button</li>
                            <li>Save your changes before switching to another page</li>
                            <li>Use responsive design classes for mobile compatibility</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Preview Mode</h4>
                      <div 
                        className="text-sm text-gray-600 whitespace-pre-wrap font-mono"
                        dangerouslySetInnerHTML={{ __html: pageContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <i className="ri-file-edit-line text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Page to Edit</h3>
              <p className="text-gray-600">Choose a page from the left sidebar to start editing its content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
