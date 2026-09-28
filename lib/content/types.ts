export type TaxCategory =
  | "Federal Taxes"
  | "Self-Employment Taxes"
  | "1099 Taxes"
  | "Quarterly Taxes"
  | "Tax Planning"
  | "Tax Basics";

export interface TaxContentSection {
  heading: string;
  content: string;
}

export interface TaxArticle {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  taxYear?: 2025 | 2026;
  category: TaxCategory;
  author: string;
  readingTime: string;
  sections: TaxContentSection[];
  relatedCalculators: Array<{
    name: string;
    href: string;
    description: string;
  }>;
  relatedArticles: string[]; // slugs
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  noindex?: boolean;
  schemaType: "Article";
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface TaxGuide {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  taxYear?: 2025 | 2026;
  category: TaxCategory;
  author: string;
  readingTime: string;
  sections: TaxContentSection[];
  statutorySources: string[];
  keyTakeaways: string[];
  relatedCalculators: Array<{
    name: string;
    href: string;
    description: string;
  }>;
  relatedGuides: string[]; // slugs
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  noindex?: boolean;
  schemaType: "Article";
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}
