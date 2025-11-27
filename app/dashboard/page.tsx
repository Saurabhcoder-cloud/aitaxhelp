'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardSidebar from '@/components/DashboardSidebar';
import ChatAssistant from '@/components/ChatAssistant';
import RefundCalculator from '@/components/RefundCalculator';
import FileTaxes from '@/components/FileTaxes';
import Documents from '@/components/Documents';
import Reminders from '@/components/Reminders';
import TaxLawInfo from '@/components/TaxLawInfo';
import MailingAddressInfo from '@/components/MailingAddressInfo';

export default function DashboardPage() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('overview');
  const [userState, setUserState] = useState('');

  useEffect(() => {
    const savedState = localStorage.getItem('userState');
    if (savedState) {
      setUserState(savedState);
    }
  }, []);

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatAssistant currentLanguage={currentLanguage} />;
      case 'calculator':
        return <RefundCalculator currentLanguage={currentLanguage} />;
      case 'file-taxes':
        return <FileTaxes currentLanguage={currentLanguage} />;
      case 'documents':
        return <Documents currentLanguage={currentLanguage} />;
      case 'reminders':
        return <Reminders currentLanguage={currentLanguage} />;
      case 'tax-laws':
        return <TaxLawInfo selectedState={userState} />;
      case 'mailing-addresses':
        return <MailingAddressInfo selectedState={userState} />;
      default:
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to TaxHelp AI</h2>
              <p className="text-gray-600 mb-6">Your comprehensive tax filing dashboard. Track your progress and manage your tax documents.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Tax Year</p>
                      <p className="text-2xl font-bold">2024</p>
                    </div>
                    <i className="ri-calendar-line text-3xl text-blue-200"></i>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Your State</p>
                      <p className="text-2xl font-bold">{userState || 'Not Set'}</p>
                    </div>
                    <i className="ri-map-pin-line text-3xl text-green-200"></i>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Documents Uploaded</p>
                      <p className="text-2xl font-bold">7</p>
                    </div>
                    <i className="ri-file-text-line text-3xl text-purple-200"></i>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100">Completion Status</p>
                      <p className="text-2xl font-bold">85%</p>
                    </div>
                    <i className="ri-pie-chart-line text-3xl text-orange-200"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="ri-upload-line text-blue-600"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">W-2 uploaded</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <i className="ri-book-open-line text-green-600"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Reviewed tax law guidance</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <i className="ri-chat-3-line text-purple-600"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Chat with AI assistant</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tax Filing Deadline</p>
                      <p className="text-xs text-gray-500">April 15, 2025</p>
                    </div>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full whitespace-nowrap">Important</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Quarterly Payment</p>
                      <p className="text-xs text-gray-500">June 15, 2025</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full whitespace-nowrap">Upcoming</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <i className="ri-calculator-line text-white text-lg"></i>
              </div>
              <span className="text-xl font-bold text-gray-900 font-['Pacifico']">TaxHelp AI</span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Home
              </Link>
              <Link href="/file-taxes" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                File Taxes
              </Link>
              <Link href="/refund-calculator" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Calculator
              </Link>
              <Link href="/plans" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Pricing
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex pt-16">
        <DashboardSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          currentLanguage={currentLanguage} 
        />
        
        <main className="flex-1 p-6">
          {renderActiveComponent()}
        </main>
      </div>
    </div>
  );
}
