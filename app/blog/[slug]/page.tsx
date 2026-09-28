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
import { TAX_ARTICLES, getArticleBySlug } from "@/lib/content/articles";
import {
  Calendar,
  Clock,
  User,
  ArrowRight,
  Calculator,
  HelpCircle,
  Share2,
} from "lucide-react";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return TAX_ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) {
    return constructMetadata({
      title: "Article Not Found",
      noIndex: true,
    });
  }

  return constructMetadata({
    title: article.seoTitle,
    description: article.seoDescription,
    path: `/blog/${article.slug}`,
    canonicalUrl: article.canonicalUrl,
    ogType: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
    authors: [article.author],
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const articleJsonLd: ArticleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.canonicalDomain}/images/logo.png`,
      },
    },
    mainEntityOfPage: article.canonicalUrl,
  };

  const relatedArticlesList = article.relatedArticles
    .map((rSlug) => getArticleBySlug(rSlug))
    .filter((a): a is typeof article => Boolean(a));

  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <JsonLd data={articleJsonLd} />
      {article.faqs && article.faqs.length > 0 && (
        <JsonLd data={getFAQPageSchema(article.faqs)} />
      )}

      <Container size="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Blog", item: "/blog" },
            { name: article.title, item: `/blog/${article.slug}` },
          ]}
          className="mb-8"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Article Content */}
          <main className="lg:col-span-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm">
                  {article.category}
                </Badge>
                {article.taxYear && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Tax Year {article.taxYear}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-surface-900 tracking-tight leading-tight">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-surface-500 pt-2 border-b border-surface-200 pb-4">
                <div className="flex items-center gap-1.5 font-medium text-surface-700">
                  <User className="w-3.5 h-3.5 text-surface-400" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-surface-400" />
                  <span>
                    Published{" "}
                    {new Date(article.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-surface-400" />
                  <span>{article.readingTime}</span>
                </div>
              </div>
            </div>

            {/* Intro Lead */}
            <div className="text-base sm:text-lg text-surface-700 leading-relaxed font-normal bg-white p-6 rounded-2xl border border-surface-200/80 shadow-xs">
              {article.description}
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {article.sections.map((sec, idx) => (
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

            {/* FAQs if present */}
            {article.faqs && article.faqs.length > 0 && (
              <div className="pt-8 border-t border-surface-200 space-y-4">
                <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand-600" />
                  <span>Frequently Asked Questions</span>
                </h2>
                <div className="space-y-3">
                  {article.faqs.map((faq, i) => (
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
              <strong>Educational Disclaimer:</strong> This article is published for educational and tax planning purposes only. Tax laws are subject to legislative changes and individual factual circumstances. For formal filing advice, consult a licensed CPA or Enrolled Agent.
            </div>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Related Calculators */}
            {article.relatedCalculators.length > 0 && (
              <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                  <Calculator className="w-4 h-4 text-brand-600" />
                  <span>Interactive Calculators</span>
                </div>
                <p className="text-xs text-surface-500">
                  Put this analysis into practice with our free deterministic calculators:
                </p>
                <div className="space-y-3">
                  {article.relatedCalculators.map((calc) => (
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

            {/* Related Articles */}
            {relatedArticlesList.length > 0 && (
              <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4 shadow-xs">
                <div className="text-surface-900 font-bold text-sm">
                  Related Tax Articles
                </div>
                <div className="space-y-3">
                  {relatedArticlesList.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/blog/${rel.slug}`}
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

            {/* Public Funnel CTA */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-surface-900 to-navy-950 text-white space-y-3 shadow-md">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Tax Intelligence Platform
              </span>
              <h3 className="text-base font-bold tracking-tight">
                Try the AI Tax Assistant
              </h3>
              <p className="text-xs text-surface-300 leading-relaxed">
                Have specific questions about your 1099 deductions or tax bracket? Our assistant explains tax concepts in plain English.
              </p>
              <Link
                href="/ai-tax-assistant"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors mt-2"
              >
                <span>Ask AI Tax Assistant</span>
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
