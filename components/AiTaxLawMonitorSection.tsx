'use client';

import { useEffect, useState } from 'react';

interface TaxUpdateItem {
  id: string;
  date: string;
  jurisdiction: string;
  title: string;
  summary: string;
  sourceUrl?: string;
  impactType?: string;
  languageCode?: string;
}

const featureCards = [
  {
    title: 'Federal & State Updates',
    description: 'AI monitors IRS bulletins and state tax agencies for real-time regulatory changes.',
    icon: 'ri-map-pin-line'
  },
  {
    title: 'Multilingual Explanations',
    description: 'Updates are explained in the user’s preferred language (English, Spanish, Russian, Arabic, Chinese, French, Hindi, etc.).',
    icon: 'ri-translate-2'
  },
  {
    title: 'Impact Analysis',
    description: 'Shows how tax changes affect the user’s refund, deductions, credits, and filing requirements.',
    icon: 'ri-bar-chart-line'
  },
  {
    title: 'Smart Alerts',
    description: 'Users receive notifications before filing deadlines or when new benefits become available.',
    icon: 'ri-notification-3-line'
  },
  {
    title: 'Automatic Compliance',
    description: 'All relevant tax updates are automatically applied to the user’s tax return draft.',
    icon: 'ri-shield-check-line'
  },
  {
    title: 'Personalized Insights',
    description: 'AI filters updates based on user documents, income type (W-2, 1099), state, and filing category.',
    icon: 'ri-sparkling-2-line'
  }
];

const fallbackUpdates: TaxUpdateItem[] = [
  {
    id: 'fallback-1',
    date: new Date().toISOString(),
    jurisdiction: 'federal',
    title: 'IRS updates digital asset guidance',
    summary: 'Broker reporting for digital assets and virtual currency questions are refreshed for the current tax year.'
  },
  {
    id: 'fallback-2',
    date: new Date().toISOString(),
    jurisdiction: 'CA',
    title: 'California adjusts renter credit thresholds',
    summary: 'Income limits for the state renter credit were increased with new cost-of-living adjustments.'
  },
  {
    id: 'fallback-3',
    date: new Date().toISOString(),
    jurisdiction: 'NY',
    title: 'New York highlights dependent care credit changes',
    summary: 'Phaseout thresholds were updated for the state child and dependent care credit.'
  }
];

export default function AiTaxLawMonitorSection() {
  const [updates, setUpdates] = useState<TaxUpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const response = await fetch('/api/tax-updates?language=en');
        if (!response.ok) {
          throw new Error('Unable to load updates');
        }
        const data = await response.json();
        const mapped = (data.updates || []).map((item: TaxUpdateItem) => ({
          ...item,
          date: item.date
        }));

        setUpdates(mapped.length ? mapped : fallbackUpdates);
      } catch (err) {
        console.error('Failed to load tax updates', err);
        setError('Unable to load live updates right now. Showing recent highlights instead.');
        setUpdates(fallbackUpdates);
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
  }, []);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">AI Tax Law Monitor</h1>
          <h2 className="text-xl sm:text-2xl text-gray-700 mb-4">
            Real-time federal and state tax updates in your preferred language.
          </h2>
          <p className="text-gray-600 max-w-4xl mx-auto">
            TaxHelp AI continuously monitors IRS updates and state tax regulations. The system translates complex tax law changes
            into simple language and provides personalized updates based on the user’s state, income type, and filing category.
            All relevant updates are automatically applied to the user’s tax return draft to ensure accuracy and compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
                  <i className={`${card.icon} text-2xl text-blue-600 dark:text-blue-300`}></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{card.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Updates</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">Latest AI-processed federal and state highlights.</p>
            </div>
            {loading && (
              <div className="flex items-center text-blue-600 dark:text-blue-300 text-sm">
                <i className="ri-loader-4-line animate-spin mr-2"></i>
                Loading updates...
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {updates.slice(0, 5).map((update) => (
              <div
                key={update.id}
                className="rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                    {update.jurisdiction === 'federal' ? 'Federal' : update.jurisdiction}
                  </span>
                  <span>{new Date(update.date).toLocaleDateString()}</span>
                </div>
                {update.sourceUrl ? (
                  <a
                    href={update.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lg font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    {update.title}
                  </a>
                ) : (
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{update.title}</p>
                )}
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{update.summary}</p>
                {update.impactType && (
                  <span className="inline-flex w-fit px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {update.impactType.replace('_', ' ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-xs text-gray-500 dark:text-gray-400 text-center">
          TaxHelp AI provides automated tax information and educational guidance based on publicly available federal and state
          sources. The service does not replace licensed legal, tax, or financial professionals.
        </p>
      </div>
    </section>
  );
}
