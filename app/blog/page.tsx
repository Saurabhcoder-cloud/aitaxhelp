import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { TAX_ARTICLES, TAX_ARTICLE_CATEGORIES } from "@/lib/content/articles";
import { Calendar, Clock, ArrowRight, BookOpen, Calculator } from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "Tax Knowledge Hub & Blog | TaxAIHelp",
  description:
    "Expert, verified tax analysis, 2025 and 2026 IRS rule updates, 1099 freelance deduction guides, and Form 1040-ES quarterly tax strategies.",
  path: "/blog",
});

export default function BlogListingPage() {
  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <Container size="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: "Blog", item: "/blog" }]} className="mb-6" />

        {/* Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tax Intelligence & Insights</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-surface-900 tracking-tight">
            Tax Knowledge Hub & Articles
          </h1>
          <p className="mt-4 text-base sm:text-lg text-surface-600 leading-relaxed">
            Statutorily verified federal tax analysis, bracket comparisons, and deduction strategies for freelancers, 1099 contractors, and individual taxpayers.
          </p>
        </div>

        {/* Category Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-10 pb-4 border-b border-surface-200">
          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider mr-2">
            Categories:
          </span>
          {TAX_ARTICLE_CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="px-3 py-1 bg-white text-surface-700 border border-surface-200 rounded-full text-xs font-medium"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TAX_ARTICLES.map((article) => (
            <article
              key={article.slug}
              className="bg-white rounded-2xl border border-surface-200/80 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-surface-500">
                  <Badge variant="brand" size="sm">
                    {article.category}
                  </Badge>
                  {article.taxYear && (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                      Tax Year {article.taxYear}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-surface-900 tracking-tight hover:text-brand-600 transition-colors">
                  <Link href={`/blog/${article.slug}`}>{article.title}</Link>
                </h2>

                <p className="text-xs sm:text-sm text-surface-600 line-clamp-3 leading-relaxed">
                  {article.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-surface-400 pt-2 border-t border-surface-100">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{article.readingTime}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  href={`/blog/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>Read Full Article</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom CTA to Calculators */}
        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-surface-900 to-navy-950 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center sm:text-left">
            <h3 className="text-xl font-bold tracking-tight">
              Ready to compute your actual tax numbers?
            </h3>
            <p className="text-xs text-surface-300 leading-relaxed">
              Our deterministic tax engine computes your exact 2025 and 2026 federal brackets, standard deduction, and Schedule SE self-employment liability in integer cents.
            </p>
          </div>
          <Link
            href="/tax-calculators"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors shadow-xs shrink-0"
          >
            <Calculator className="w-4 h-4" />
            <span>Open Free Calculators</span>
          </Link>
        </div>
      </Container>
    </div>
  );
}
