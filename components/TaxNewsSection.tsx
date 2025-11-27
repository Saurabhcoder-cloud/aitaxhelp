
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NewsItem {
  id: string;
  date: string;
  headline: string;
  summary: string;
  source: string;
  category: 'federal' | 'state' | 'general';
}

export default function TaxNewsSection() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching daily tax news updates
    const fetchTaxNews = () => {
      const mockNews: NewsItem[] = [
        {
          id: '1',
          date: new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          headline: 'IRS Extends Tax Filing Deadline for Disaster-Affected Areas',
          summary: 'The Internal Revenue Service announced an extension of tax filing and payment deadlines for taxpayers in federally declared disaster areas. Affected individuals and businesses now have additional time to file their returns.',
          source: 'IRS',
          category: 'federal'
        },
        {
          id: '2',
          date: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          headline: 'New Standard Deduction Amounts for 2024 Tax Year',
          summary: 'The IRS has announced inflation adjustments for tax year 2024, including increased standard deduction amounts. Single filers can now deduct $14,600, while married filing jointly can deduct $29,200.',
          source: 'IRS',
          category: 'federal'
        },
        {
          id: '3',
          date: new Date(Date.now() - 172800000).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          headline: 'California Updates State Tax Withholding Tables',
          summary: 'California Franchise Tax Board has released updated withholding tables for 2024. Employers should implement these changes to ensure proper state tax withholding from employee paychecks.',
          source: 'California FTB',
          category: 'state'
        },
        {
          id: '4',
          date: new Date(Date.now() - 259200000).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          headline: 'Congress Considers Changes to Child Tax Credit',
          summary: 'Bipartisan legislation in Congress proposes modifications to the Child Tax Credit, potentially expanding eligibility and increasing credit amounts for qualifying families.',
          source: 'U.S. Congress',
          category: 'federal'
        },
        {
          id: '5',
          date: new Date(Date.now() - 345600000).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          headline: 'IRS Warns of Increased Tax Scam Activity',
          summary: 'The IRS issued a consumer alert about sophisticated tax-related scams targeting taxpayers through phone calls, emails, and text messages. Taxpayers are advised to verify any IRS communication through official channels.',
          source: 'IRS',
          category: 'general'
        }
      ];

      setTimeout(() => {
        setNewsItems(mockNews);
        setLoading(false);
      }, 1000);
    };

    fetchTaxNews();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'federal':
        return 'ri-government-line';
      case 'state':
        return 'ri-map-line';
      default:
        return 'ri-information-line';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'federal':
        return 'bg-blue-100 text-blue-800';
      case 'state':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Daily U.S. Tax Law Updates</h2>
            <div className="flex items-center justify-center">
              <i className="ri-loader-4-line animate-spin text-2xl text-blue-600 mr-2"></i>
              <span className="text-gray-600">Loading latest tax news...</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Daily U.S. Tax Law Updates</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stay informed with the latest changes and updates in U.S. tax legislation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {newsItems.slice(0, 6).map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(item.category)}`}>
                    <i className={`${getCategoryIcon(item.category)} mr-1`}></i>
                    {item.category === 'federal' ? 'Federal' : item.category === 'state' ? 'State' : 'General'}
                  </span>
                  <span className="text-sm text-gray-500">{item.date}</span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                  {item.headline}
                </h3>
                
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {item.summary}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600 font-medium">
                    Source: {item.source}
                  </span>
                  <button className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors">
                    Read More →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/tax-news"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
          >
            <i className="ri-newspaper-line mr-2"></i>
            View All Tax News
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <i className="ri-information-line text-yellow-600 mr-3 mt-1"></i>
            <div>
              <h4 className="font-semibold text-yellow-800 mb-2">Important Disclaimer</h4>
              <p className="text-yellow-700 text-sm">
                These updates are for informational purposes only and do not constitute legal or tax advice. 
                Please consult a qualified tax professional or official government sources for specific guidance 
                regarding your tax situation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
