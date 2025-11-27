
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '../../components/Footer';

interface NewsItem {
  id: string;
  date: string;
  headline: string;
  summary: string;
  fullContent: string;
  source: string;
  category: 'federal' | 'state' | 'general';
}

export default function TaxNews() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
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
          fullContent: 'The Internal Revenue Service has announced relief measures for taxpayers affected by recent natural disasters. This extension applies to both individual and business tax returns, as well as estimated tax payments. Taxpayers in affected areas should check the IRS website for specific deadline extensions applicable to their location.',
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
          fullContent: 'The annual inflation adjustments affect numerous tax provisions for tax year 2024. In addition to standard deduction increases, the tax brackets have also been adjusted upward. These changes help prevent bracket creep and maintain the real value of tax benefits.',
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
          fullContent: 'The updated withholding tables reflect changes in California state tax rates and brackets. Employers have 60 days to implement the new tables. Employees may need to submit new Form DE 4 if their withholding preferences have changed.',
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
          fullContent: 'The proposed legislation would restore the enhanced Child Tax Credit provisions that were temporarily in effect. This includes increasing the credit amount and making it fully refundable for more families. The bill has support from both parties but faces challenges in the current legislative environment.',
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
          fullContent: 'Scammers are using increasingly sophisticated methods to impersonate IRS agents and steal personal information. The IRS reminds taxpayers that they will never initiate contact by phone, email, or text message to request personal or financial information. All legitimate IRS communications come through official mail.',
          source: 'IRS',
          category: 'general'
        },
        {
          id: '6',
          date: new Date(Date.now() - 432000000).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          headline: 'New York State Implements Digital Tax Filing Requirements',
          summary: 'New York State has announced new requirements for digital tax filing, affecting both individual and business taxpayers. The changes aim to streamline the filing process and reduce processing times.',
          fullContent: 'The New York State Department of Taxation and Finance has implemented new digital filing requirements to modernize tax administration. These changes include mandatory electronic filing for certain taxpayers and enhanced security measures for online submissions.',
          source: 'NY State Tax Dept',
          category: 'state'
        }
      ];

      setTimeout(() => {
        setNewsItems(mockNews);
        setLoading(false);
      }, 1000);
    };

    fetchTaxNews();
  }, []);

  const filteredNews = selectedCategory === 'all' 
    ? newsItems 
    : newsItems.filter(item => item.category === selectedCategory);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Static Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <i className="ri-calculator-line text-white text-lg"></i>
              </div>
              <span className="text-xl font-bold text-gray-900 font-['Pacifico']">TaxHelp AI</span>
            </Link>

            {/* Desktop Navigation */}
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
              <Link href="/tax-news" className="text-blue-600 font-medium">
                Tax News
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
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

      {/* Hero Section */}
      <section className="relative py-32 bg-gradient-to-r from-blue-900 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Latest News in U.S. Tax Law</h1>
          <p className="text-xl max-w-3xl mx-auto leading-relaxed">
            Stay updated with daily changes and updates in federal and state tax legislation
          </p>
        </div>
      </section>

      {/* News Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {['all', 'federal', 'state', 'general'].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-full font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All News' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <i className="ri-loader-4-line animate-spin text-4xl text-blue-600 mb-4"></i>
              <p className="text-gray-600">Loading latest tax news...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredNews.map((item) => (
                <article key={item.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(item.category)}`}>
                        <i className={`${getCategoryIcon(item.category)} mr-1`}></i>
                        {item.category === 'federal' ? 'Federal' : item.category === 'state' ? 'State' : 'General'}
                      </span>
                      <span className="text-sm text-gray-500">{item.date}</span>
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                      {item.headline}
                    </h2>
                    
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {item.summary}
                    </p>
                    
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600 font-medium">
                          Source: {item.source}
                        </span>
                        <button className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors">
                          Read Full Article →
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-16 bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <div className="flex items-start">
              <i className="ri-information-line text-yellow-600 mr-4 mt-1 text-xl"></i>
              <div>
                <h3 className="font-bold text-yellow-800 mb-3 text-lg">Important Disclaimer</h3>
                <p className="text-yellow-700">
                  These updates are for informational purposes only and do not constitute legal or tax advice. 
                  Please consult a qualified tax professional or official government sources for specific guidance 
                  regarding your tax situation. Always verify information with official IRS and state tax authority websites.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
