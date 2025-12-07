import React from 'react';

const features = [
  {
    icon: 'ri-steering-2-line',
    title: 'Built for Gig Workers',
    description:
      'DoorDash, UberEats, Lyft, Instacart, Uber, Amazon Flex — automatic mileage, vehicle expenses, tips, and gig-income deductions.'
  },
  {
    icon: 'ri-translate-2',
    title: 'Built for Immigrants',
    description:
      'Support in 10 languages. Step-by-step assistance with simple explanations — no accounting knowledge required.'
  },
  {
    icon: 'ri-team-line',
    title: 'Built for Families',
    description:
      'Automatic Child Tax Credit, Earned Income Credit, dependents, and joint filings.'
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Built for Seniors',
    description:
      'Clear and simple help with Social Security (SSA-1099), retirement income, and medical deductions.'
  },
  {
    icon: 'ri-hand-heart-line',
    title: 'Built for Low-Income Households',
    description:
      'Affordable pricing and free filing for selected groups when grant funding becomes available.'
  }
];

export default function WhyDifferentSection() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Why TaxHelp AI Is Different</h2>
          <p className="mt-4 text-lg text-gray-600">
            Most tax platforms are built for accountants or high-income users. We built TaxHelp AI for real people.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 flex flex-col gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
                <i className={feature.icon}></i>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
