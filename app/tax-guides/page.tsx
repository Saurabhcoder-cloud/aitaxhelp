import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { TAX_GUIDES, TAX_GUIDE_CATEGORIES } from "@/lib/content/guides";
import { BookOpen, CheckCircle, Clock, ArrowRight, Calculator, ShieldCheck } from "lucide-react";

export const metadata: Metadata = constructMetadata({
  title: "Comprehensive US Tax Guides & Education | TaxAIHelp",
  description:
    "Plain-English, verified educational guides on federal progressive tax brackets, Schedule SE self-employment tax, 1099 write-offs, and Form 1040-ES quarterly estimates.",
  path: "/tax-guides",
});

export default function TaxGuidesListingPage() {
  return (
    <div className="py-12 bg-surface-50 min-h-screen">
      <Container size="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ name: "Tax Guides", item: "/tax-guides" }]} className="mb-6" />

        {/* Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Educational Tax Resource</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-surface-900 tracking-tight">
            Official Federal Tax Guides
          </h1>
          <p className="mt-4 text-base sm:text-lg text-surface-600 leading-relaxed">
            Master US federal taxation principles through statutorily verified guides. Learn how progressive brackets work, how self-employment tax is computed, and how to avoid quarterly penalty traps.
          </p>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-10 pb-4 border-b border-surface-200">
          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider mr-2">
            Topics:
          </span>
          {TAX_GUIDE_CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="px-3 py-1 bg-white text-surface-700 border border-surface-200 rounded-full text-xs font-medium"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TAX_GUIDES.map((guide) => (
            <div
              key={guide.slug}
              className="bg-white rounded-2xl border border-surface-200/80 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-surface-500">
                  <Badge variant="brand" size="sm">
                    {guide.category}
                  </Badge>
                  <div className="flex items-center gap-1 text-surface-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{guide.readingTime}</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-surface-900 tracking-tight hover:text-brand-600 transition-colors">
                  <Link href={`/tax-guides/${guide.slug}`}>{guide.title}</Link>
                </h2>

                <p className="text-xs sm:text-sm text-surface-600 line-clamp-3 leading-relaxed">
                  {guide.description}
                </p>

                {/* Key Takeaways Preview */}
                <div className="p-3 rounded-xl bg-surface-50 space-y-1.5 border border-surface-100">
                  <div className="text-[11px] font-bold text-surface-700 uppercase tracking-wider">
                    Core Rule:
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-surface-600">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{guide.keyTakeaways[0]}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  href={`/tax-guides/${guide.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>Explore Complete Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Legal Disclaimer Box */}
        <div className="mt-16 p-6 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Educational Tax Information Standards</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            All TaxAIHelp guides are strictly educational and grounded in official statutory authorities (Internal Revenue Code, IRS Revenue Procedures, and Social Security Administration fact sheets). TaxAIHelp is not a CPA firm or government entity. For individualized tax filing guidance, consult a licensed tax professional.
          </p>
        </div>
      </Container>
    </div>
  );
}
