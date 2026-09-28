import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { constructMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd, ArticleSchema, getFAQPageSchema } from "@/components/seo/JsonLd";
import { SITE_CONFIG } from "@/lib/seo/config";
import { TAX_GUIDES, getGuideBySlug } from "@/lib/content/guides";
import {
  Clock,
  User,
  ArrowRight,
  Calculator,
  HelpCircle,
  CheckCircle,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface TaxGuidePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return TAX_GUIDES.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({ params }: TaxGuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return constructMetadata({
      title: "Tax Guide Not Found",
      noIndex: true,
    });
  }

  return constructMetadata({
    title: guide.seoTitle,
    description: guide.seoDescription,
    path: `/tax-guides/${guide.slug}`,
    canonicalUrl: guide.canonicalUrl,
    ogType: "article",
    publishedTime: guide.publishedAt,
    modifiedTime: guide.updatedAt,
    authors: [guide.author],
  });
}

export default async function TaxGuideDetailPage({ params }: TaxGuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const articleJsonLd: ArticleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: {
      "@type": "Organization",
      name: guide.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.canonicalDomain}/images/logo.png`,
      },
    },
    mainEntityOfPage: guide.canonicalUrl,
  };

  const relatedGuidesList = guide.relatedGuides
    .map((rSlug) => getGuideBySlug(rSlug))
    .filter((g): g is typeof guide => Boolean(g));

  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <JsonLd data={articleJsonLd} />
      {guide.faqs.length > 0 && <JsonLd data={getFAQPageSchema(guide.faqs)} />}

      <Container size="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Tax Guides", item: "/tax-guides" },
            { name: guide.title, item: `/tax-guides/${guide.slug}` },
          ]}
          className="mb-8"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <main className="lg:col-span-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm">
                  {guide.category}
                </Badge>
                {guide.taxYear && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Tax Year {guide.taxYear} Rules
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-surface-900 tracking-tight leading-tight">
                {guide.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-surface-500 pt-2 border-b border-surface-200 pb-4">
                <div className="flex items-center gap-1.5 font-medium text-surface-700">
                  <User className="w-3.5 h-3.5 text-surface-400" />
                  <span>{guide.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-surface-400" />
                  <span>{guide.readingTime}</span>
                </div>
              </div>
            </div>

            {/* Key Takeaways Card */}
            <div className="p-6 rounded-2xl bg-white border border-brand-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-brand-800 font-bold text-sm uppercase tracking-wider">
                <CheckCircle className="w-4 h-4 text-brand-600" />
                <span>Key Takeaways</span>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-surface-700">
                {guide.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-brand-600 font-bold">•</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {guide.sections.map((sec, idx) => (
                <section key={idx} className="space-y-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">
                    {sec.heading}
                  </h2>
                  <p className="text-sm sm:text-base text-surface-700 leading-relaxed">
                    {sec.content}
                  </p>
                </section>
              ))}
            </div>

            {/* Statutory Sources */}
            <div className="p-6 rounded-2xl bg-surface-100 border border-surface-200 space-y-3">
              <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                <FileText className="w-4 h-4 text-surface-700" />
                <span>Statutory Authorities & IRS References</span>
              </div>
              <ul className="space-y-1.5 text-xs text-surface-600 font-mono">
                {guide.statutorySources.map((source, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-surface-400" />
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQs */}
            {guide.faqs.length > 0 && (
              <div className="pt-8 border-t border-surface-200 space-y-4">
                <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand-600" />
                  <span>Frequently Asked Questions</span>
                </h2>
                <div className="space-y-3">
                  {guide.faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="p-5 bg-white rounded-2xl border border-surface-200 space-y-2"
                    >
                      <h3 className="font-semibold text-sm text-surface-900">
                        {faq.question}
                      </h3>
                      <p className="text-xs sm:text-sm text-surface-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Educational Disclaimer */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Educational Disclaimer:</strong> This guide is maintained for public educational reference and does not constitute formal legal or certified accounting advice. For individual tax return preparation or audit representation, connect with a licensed CPA or Enrolled Agent.
            </div>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Calculators Card */}
            {guide.relatedCalculators.length > 0 && (
              <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                  <Calculator className="w-4 h-4 text-brand-600" />
                  <span>Related Calculators</span>
                </div>
                <div className="space-y-3">
                  {guide.relatedCalculators.map((calc) => (
                    <Link
                      key={calc.name}
                      href={calc.href}
                      className="block p-3.5 rounded-xl bg-surface-50 hover:bg-brand-50 border border-surface-200/80 hover:border-brand-200 transition-colors group"
                    >
                      <div className="text-xs font-bold text-surface-900 group-hover:text-brand-700 flex items-center justify-between">
                        <span>{calc.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-surface-500 mt-1 line-clamp-2">
                        {calc.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Guides */}
            {relatedGuidesList.length > 0 && (
              <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4 shadow-xs">
                <div className="text-surface-900 font-bold text-sm">
                  Related Educational Guides
                </div>
                <div className="space-y-3">
                  {relatedGuidesList.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/tax-guides/${rel.slug}`}
                      className="block p-3 rounded-xl hover:bg-surface-50 border border-transparent hover:border-surface-200 transition-colors"
                    >
                      <div className="text-xs font-semibold text-surface-900 line-clamp-2">
                        {rel.title}
                      </div>
                      <div className="text-[10px] text-surface-400 mt-1">
                        {rel.readingTime} • {rel.category}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Public CTA Funnel */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-surface-900 to-navy-950 text-white space-y-3 shadow-md">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                AI Tax Assistance
              </span>
              <h3 className="text-base font-bold tracking-tight">
                Explain This with AI
              </h3>
              <p className="text-xs text-surface-300 leading-relaxed">
                Connect your actual filing numbers with the AI Assistant to see how these tax rules apply to your specific situation.
              </p>
              <Link
                href="/ai-tax-assistant"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors mt-2"
              >
                <span>Ask AI Assistant</span>
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
