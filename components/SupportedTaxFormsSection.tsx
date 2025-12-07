import React from 'react';

const categories = [
  {
    title: 'Income Forms',
    items: [
      'W-2',
      '1099-NEC',
      '1099-MISC',
      '1099-K',
      '1099-INT / 1099-DIV',
      'SSA-1099',
      '1099-R'
    ]
  },
  {
    title: 'Health & Benefits',
    items: ['1095-A (Marketplace Health Insurance)', '1095-B / 1095-C']
  },
  {
    title: 'Gig & Freelance',
    items: ['Schedule C', 'Vehicle mileage', 'Business expenses', 'Depreciation & supplies']
  },
  {
    title: 'Family & Credits',
    items: ['Child Tax Credit', 'Earned Income Tax Credit', 'Dependent care credits']
  },
  {
    title: 'State Filing',
    items: ['All U.S. states and local jurisdictions supported.']
  }
];

export default function SupportedTaxFormsSection() {
  return (
    <section className="bg-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Supported Tax Forms</h2>
          <p className="mt-3 text-lg text-gray-600">
            TaxHelp AI supports all major U.S. federal and state forms, including:
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div
              key={category.title}
              className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-gray-900">{category.title}</h3>
              <ul className="mt-4 space-y-2 text-gray-700 leading-relaxed">
                {category.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-blue-500 mt-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500" aria-hidden />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
