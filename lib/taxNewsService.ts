import fs from 'fs';
import path from 'path';

export interface TaxNewsItem {
  id: string;
  date: string; // ISO date
  headline: string;
  summary: string;
  fullContent: string;
  source: string;
  category: 'federal' | 'state' | 'general';
}

const newsFilePath = path.join(process.cwd(), 'data', 'news.json');

function ensureNewsFile() {
  if (!fs.existsSync(newsFilePath)) {
    fs.mkdirSync(path.dirname(newsFilePath), { recursive: true });
    fs.writeFileSync(newsFilePath, '[]', 'utf-8');
  }
}

export function readNews(): TaxNewsItem[] {
  ensureNewsFile();
  const raw = fs.readFileSync(newsFilePath, 'utf-8');
  return JSON.parse(raw || '[]');
}

function writeNews(items: TaxNewsItem[]) {
  ensureNewsFile();
  fs.writeFileSync(newsFilePath, JSON.stringify(items, null, 2), 'utf-8');
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateDailyHeadline(): TaxNewsItem {
  const today = new Date();
  const topics = [
    {
      headline: 'IRS releases fresh guidance on digital asset reporting',
      summary:
        'The IRS clarified how brokers should report digital asset transactions and reminded taxpayers to answer the virtual currency question on their returns.',
      fullContent:
        'The Internal Revenue Service published new FAQs explaining broker reporting obligations for digital assets. Taxpayers are reminded to keep detailed records and accurately answer the virtual currency question on Form 1040. This update reflects ongoing Treasury efforts to tighten compliance while offering clearer rules.',
      source: 'IRS',
      category: 'federal' as const
    },
    {
      headline: 'State conformity updates change deduction options for 2024',
      summary:
        'Multiple states updated their conformity to federal tax law, affecting standard deduction amounts and certain credits for the 2024 filing season.',
      fullContent:
        'Several states have enacted conformity adjustments aligning state codes with recent federal legislation. The updates adjust standard deduction amounts and expand eligibility for earned income and child-related credits. TaxAIHelp applies these updates automatically when calculating resident returns.',
      source: 'State legislatures',
      category: 'state' as const
    },
    {
      headline: 'IRS reminds filers about clean vehicle credit paperwork',
      summary:
        'Taxpayers claiming the clean vehicle credit should keep seller reports and confirm VIN eligibility before filing.',
      fullContent:
        'With more electric vehicles eligible for the clean vehicle credit, the IRS emphasized retaining seller reports and checking VINs through the official lookup tool. Proper documentation helps avoid processing delays and supports refund timing.',
      source: 'IRS',
      category: 'general' as const
    },
    {
      headline: 'Estimated tax payment deadline approaching',
      summary: 'The next quarterly estimated tax deadline is approaching. Self-employed filers should review withholding and deductions.',
      fullContent:
        'TaxAIHelp recommends confirming your current year estimates for income, withholding, and deductions to avoid underpayment penalties. Adjusting payments now can balance liabilities for both federal and state returns.',
      source: 'TaxAIHelp briefing',
      category: 'federal' as const
    }
  ];

  const pick = topics[Math.floor(Math.random() * topics.length)];
  return {
    id: `${Date.now()}`,
    date: formatDate(today),
    headline: pick.headline,
    summary: pick.summary,
    fullContent: pick.fullContent,
    source: pick.source,
    category: pick.category
  };
}

export function ensureDailyNews(): TaxNewsItem[] {
  const news = readNews();
  const today = formatDate(new Date());
  const alreadyCreated = news.some(item => item.date === today);

  if (!alreadyCreated) {
    const newItem = generateDailyHeadline();
    const nextNews = [newItem, ...news].slice(0, 50); // keep last 50
    writeNews(nextNews);
    return nextNews;
  }

  return news;
}
