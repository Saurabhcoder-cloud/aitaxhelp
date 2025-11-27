
'use client';

import Link from 'next/link';

interface ServiceCardProps {
  icon: string;
  title: string;
  description: string;
  features: string[];
  href: string;
}

export default function ServiceCard({ icon, title, description, features, href }: ServiceCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100 group hover:-translate-y-1">
      <div className="w-16 h-16 flex items-center justify-center bg-blue-100 rounded-xl mb-6 group-hover:bg-blue-600 transition-colors">
        <i className={`${icon} text-2xl text-blue-600 group-hover:text-white transition-colors`}></i>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>
      
      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-700">
            <i className="ri-check-line text-green-500 mr-2"></i>
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      
      <Link 
        href={href}
        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
      >
        Learn More
        <i className="ri-arrow-right-line ml-1"></i>
      </Link>
    </div>
  );
}
