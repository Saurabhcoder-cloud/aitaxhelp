
'use client';

import { useState } from 'react';

interface StateSelectorProps {
  selectedState: string;
  onStateChange: (state: string) => void;
  currentLanguage: string;
}

const states = [
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

export default function StateSelector({ selectedState, onStateChange, currentLanguage }: StateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStates = states.filter(state =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStateName = states.find(state => state.code === selectedState)?.name || 'Select State';

  const handleStateSelect = (stateCode: string) => {
    onStateChange(stateCode);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Your State
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className={selectedState ? 'text-gray-900' : 'text-gray-500'}>
              {selectedStateName}
            </span>
            <i className={`ri-arrow-down-s-line transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search states..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {filteredStates.length > 0 ? (
                filteredStates.map((state) => (
                  <button
                    key={state.code}
                    type="button"
                    onClick={() => handleStateSelect(state.code)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                      selectedState === state.code ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{state.name}</span>
                      <span className="text-sm text-gray-500">{state.code}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  No states found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedState && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <i className="ri-map-pin-line text-blue-600"></i>
            <span className="text-sm text-blue-800">
              Selected: {selectedStateName} ({selectedState})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
