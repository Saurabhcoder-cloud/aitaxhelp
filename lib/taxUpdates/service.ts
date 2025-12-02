import { prisma } from '../prisma';

export type ImpactType = 'credit' | 'deduction' | 'filing_rule' | 'refund';
export type Jurisdiction = 'federal' | string;
export type LanguageCode = 'en' | 'es' | 'ru' | 'ar' | 'zh' | 'fr' | 'hi' | string;

export interface RawTaxUpdate {
  date: Date;
  jurisdiction: Jurisdiction;
  title: string;
  sourceUrl: string;
  impactType: ImpactType;
  detail: string;
}

const SUPPORTED_LANGUAGES: LanguageCode[] = ['en', 'es', 'ru', 'ar', 'zh', 'fr', 'hi'];

export async function fetchRawTaxData(): Promise<RawTaxUpdate[]> {
  const now = new Date();
  return [
    {
      date: now,
      jurisdiction: 'federal',
      title: 'IRS updates filing guidance for digital assets',
      sourceUrl: 'https://www.irs.gov/newsroom',
      impactType: 'filing_rule',
      detail:
        'The IRS clarified broker reporting requirements for digital asset transactions and updated the virtual currency question for 1040 filers.'
    },
    {
      date: now,
      jurisdiction: 'CA',
      title: 'California expands renter credit income thresholds',
      sourceUrl: 'https://www.ftb.ca.gov',
      impactType: 'credit',
      detail:
        'California Franchise Tax Board announced higher income limits for the nonrefundable renter credit, aligned with recent cost-of-living adjustments.'
    },
    {
      date: now,
      jurisdiction: 'NY',
      title: 'New York reminder on child and dependent care credit phaseouts',
      sourceUrl: 'https://www.tax.ny.gov',
      impactType: 'deduction',
      detail:
        'New York Tax Department reiterated updated phaseout thresholds for the state child and dependent care credit effective for the current tax year.'
    }
  ];
}

export function summarizeTaxUpdateWithAI(raw: RawTaxUpdate): string {
  return `${raw.title}: ${raw.detail}`;
}

export function translateSummaryWithAI(summary: string, language: LanguageCode): string {
  if (language === 'en') return summary;
  return `${summary} (translated to ${language})`;
}

export async function runDailyTaxUpdateJob() {
  const rawUpdates = await fetchRawTaxData();
  for (const raw of rawUpdates) {
    const baseSummary = summarizeTaxUpdateWithAI(raw);

    for (const languageCode of SUPPORTED_LANGUAGES) {
      const localizedSummary = translateSummaryWithAI(baseSummary, languageCode);

      await prisma.taxUpdate.upsert({
        where: {
          date_jurisdiction_title_languageCode: {
            date: raw.date,
            jurisdiction: raw.jurisdiction,
            title: raw.title,
            languageCode
          }
        },
        create: {
          date: raw.date,
          jurisdiction: raw.jurisdiction,
          title: raw.title,
          summary: localizedSummary,
          sourceUrl: raw.sourceUrl,
          impactType: raw.impactType,
          languageCode
        },
        update: {
          summary: localizedSummary,
          sourceUrl: raw.sourceUrl,
          impactType: raw.impactType
        }
      });
    }
  }
}

export async function getRecentTaxUpdates(limit = 5, language?: string, jurisdiction?: string) {
  return prisma.taxUpdate.findMany({
    where: {
      languageCode: language,
      jurisdiction: jurisdiction
    },
    orderBy: {
      date: 'desc'
    },
    take: limit
  });
}
