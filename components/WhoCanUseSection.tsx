import React from 'react';

const personas = [
  {
    icon: 'ri-steering-2-line',
    title: 'Gig Workers & Freelancers',
    bullets: [
      'DoorDash, UberEats, Instacart, Lyft, Uber, TaskRabbit, Amazon Flex',
      'Automatic mileage tracking',
      'Business expense optimization',
      'Schedule C supported'
    ]
  },
  {
    icon: 'ri-translate-2',
    title: 'Immigrants & Non-Native English Speakers',
    bullets: ['10 languages supported', 'Simple explanations', 'Step-by-step assistance']
  },
  {
    icon: 'ri-team-line',
    title: 'Families',
    bullets: ['Dependents and children', 'Child Tax Credit', 'Joint filing for married couples']
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Seniors & Retirees',
    bullets: ['SSA-1099', 'Pension income', 'Medical deductions', 'Clear, simple instructions']
  }
];

export default function WhoCanUseSection() {
  return (
    <section className="bg-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Who Can Use TaxHelp AI?</h2>
          <p className="mt-4 text-lg text-gray-600">Designed for real people with real tax situations.</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {personas.map((persona) => (
            <div
              key={persona.title}
              className="bg-slate-50 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
                <i className={persona.icon}></i>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">{persona.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 leading-relaxed list-disc list-inside">
                {persona.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
