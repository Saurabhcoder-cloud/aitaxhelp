import React from 'react';

const items = [
  {
    icon: 'ri-shield-keyhole-line',
    title: 'Bank-Level Encryption',
    description: 'All tax documents are encrypted during upload, processing, and storage.'
  },
  {
    icon: 'ri-lock-2-line',
    title: 'Secure Document Storage',
    description: 'Your information is never shared or sold. Documents can be deleted anytime.'
  },
  {
    icon: 'ri-file-shield-2-line',
    title: 'IRS Compliance',
    description:
      'TaxHelp AI follows IRS Publication 1345 and IRS data-protection standards. We are preparing for IRS e-File Provider certification in 2026.'
  },
  {
    icon: 'ri-eye-off-line',
    title: 'Data Confidentiality',
    description: 'We never use your documents to train AI models.'
  }
];

export default function SecurityComplianceSection() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Security & IRS Compliance</h2>
          <p className="mt-4 text-lg text-gray-600">Your privacy and security are our top priority.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl p-6 h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
                <i className={item.icon}></i>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
