
'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';

export default function About() {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const team = [
    {
      name: 'Dr. Sarah Chen',
      role: 'CEO & Founder',
      image: 'https://readdy.ai/api/search-image?query=Professional%20Asian%20businesswoman%20CEO%20in%20formal%20attire%2C%20confident%20executive%20portrait%20with%20modern%20office%20background%2C%20clean%20corporate%20headshot%20with%20professional%20lighting%20and%20blue%20color%20scheme&width=300&height=300&seq=team-ceo-1&orientation=squarish',
      description: 'Leading TaxHelp AI with over 15 years of experience in fintech and AI-powered solutions.'
    },
    {
      name: 'Michael Rodriguez',
      role: 'CTO',
      image: 'https://readdy.ai/api/search-image?query=Professional%20Hispanic%20businessman%20CTO%20in%20formal%20attire%2C%20technical%20expert%20portrait%20with%20confident%20expression%2C%20modern%20office%20background%2C%20clean%20corporate%20headshot%20with%20professional%20lighting%20and%20blue%20color%20scheme&width=300&height=300&seq=team-cto-2&orientation=squarish',
      description: 'Technology expert specializing in AI, machine learning, and tax automation platforms.'
    },
    {
      name: 'Emily Johnson',
      role: 'Head of Tax Operations',
      image: 'https://readdy.ai/api/search-image?query=Professional%20Caucasian%20businesswoman%20in%20formal%20attire%2C%20tax%20operations%20director%20portrait%20with%20friendly%20professional%20expression%2C%20modern%20office%20background%2C%20clean%20corporate%20headshot%20with%20professional%20lighting%20and%20blue%20color%20scheme&width=300&height=300&seq=team-ops-1&orientation=squarish',
      description: 'Managing tax compliance and ensuring accuracy across global tax regulations.'
    },
    {
      name: 'David Kim',
      role: 'Head of AI Research',
      image: 'https://readdy.ai/api/search-image?query=Professional%20Asian%20businessman%20in%20modern%20business%20attire%2C%20AI%20research%20director%20portrait%20with%20innovative%20professional%20expression%2C%20modern%20office%20background%2C%20clean%20corporate%20headshot%20with%20professional%20lighting%20and%20blue%20color%20scheme&width=300&height=300&seq=team-ai-2&orientation=squarish',
      description: 'AI researcher focusing on natural language processing and document automation.'
    }
  ];

  const milestones = [
    { year: '2020', title: 'Company Founded', description: 'Started with a vision to simplify global tax filing using AI' },
    { year: '2021', title: 'AI Engine Launch', description: 'Launched first AI-powered tax document processing system' },
    { year: '2022', title: 'Global Expansion', description: 'Expanded to support tax filing in 15+ countries' },
    { year: '2023', title: 'OCR Technology', description: 'Introduced advanced OCR with 99% accuracy for tax documents' },
    { year: '2024', title: 'Market Leader', description: 'Became leading AI tax platform with 50,000+ users worldwide' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} />
      
      {/* Hero Section */}
      <section className="relative py-32 bg-gradient-to-r from-blue-900 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About TaxHelp AI</h1>
          <p className="text-xl max-w-3xl mx-auto leading-relaxed">
            Revolutionizing global tax filing through artificial intelligence and automation since 2020
          </p>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                TaxHelp AI was founded in 2020 with a mission to democratize tax filing through artificial intelligence. What started as a simple document processing tool has evolved into a comprehensive global tax platform serving users across multiple countries.
              </p>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                We understand that tax filing can be complex, time-consuming, and stressful. Our AI-powered platform addresses these challenges by automating document processing, calculations, and form generation while ensuring compliance with local tax regulations.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Today, we're proud to help thousands of individuals and businesses file their taxes accurately and efficiently, saving time and maximizing refunds through our intelligent optimization algorithms.
              </p>
              <Link href="/contact" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-colors whitespace-nowrap cursor-pointer">
                Get Started Today
              </Link>
            </div>
            <div>
              <img 
                src="https://readdy.ai/api/search-image?query=Modern%20AI%20tax%20office%20environment%20with%20diverse%20team%20working%20on%20computers%2C%20tax%20automation%20platforms%20on%20screens%2C%20professional%20workspace%20with%20glass%20walls%20and%20contemporary%20design%2C%20collaborative%20atmosphere%20with%20digital%20tax%20forms&width=600&height=400&seq=about-story-1&orientation=landscape"
                alt="Our Story"
                className="rounded-xl shadow-lg object-cover w-full h-96 object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
              <div className="w-20 h-20 flex items-center justify-center bg-blue-100 rounded-full mx-auto mb-6">
                <i className="ri-target-line text-3xl text-blue-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                To empower individuals and businesses worldwide by providing intelligent, secure, and efficient AI-powered tax filing solutions that simplify complex tax processes and maximize financial outcomes.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
              <div className="w-20 h-20 flex items-center justify-center bg-blue-100 rounded-full mx-auto mb-6">
                <i className="ri-eye-line text-3xl text-blue-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-600 leading-relaxed">
                To become the world's most trusted AI tax platform, where anyone can file their taxes with confidence, knowing they're getting the maximum refund while staying fully compliant with tax regulations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Journey</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Key milestones in our growth as a leading AI-powered tax platform
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-blue-200"></div>
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <div className="text-blue-600 font-bold text-2xl mb-2">{milestone.year}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{milestone.title}</h3>
                      <p className="text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                  
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow-lg"></div>
                  
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Leadership Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experienced professionals driving innovation in AI-powered tax solutions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <img 
                  src={member.image}
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover object-top"
                />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-blue-600 font-semibold mb-4">{member.role}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">50,000+</div>
              <div className="text-blue-100">Users Worldwide</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99%</div>
              <div className="text-blue-100">OCR Accuracy</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-blue-100">Countries Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">$50M+</div>
              <div className="text-blue-100">Refunds Processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-100 rounded-full mx-auto mb-4">
                <i className="ri-shield-check-line text-2xl text-blue-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Security First</h3>
              <p className="text-gray-600">Bank-level encryption and security protocols protect your sensitive financial data.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-100 rounded-full mx-auto mb-4">
                <i className="ri-lightbulb-line text-2xl text-blue-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Innovation</h3>
              <p className="text-gray-600">Continuously advancing AI technology to make tax filing simpler and more accurate.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-100 rounded-full mx-auto mb-4">
                <i className="ri-heart-line text-2xl text-blue-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">User-Centric</h3>
              <p className="text-gray-600">Every feature is designed with our users' needs and experience in mind.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Experience AI-Powered Tax Filing?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of satisfied users who trust TaxHelp AI for their tax filing needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/file-taxes" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-colors whitespace-nowrap cursor-pointer">
              Start Filing Now
            </Link>
            <Link href="/plans" className="bg-transparent border-2 border-blue-400 hover:bg-blue-600 text-blue-400 hover:text-white px-8 py-4 rounded-full text-lg font-semibold transition-colors whitespace-nowrap cursor-pointer">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} />
    </div>
  );
}
