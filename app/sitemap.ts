import { MetadataRoute } from "next";
import { SITE_CONFIG } from "../lib/seo/config";
import { TAX_ARTICLES } from "../lib/content/articles";
import { TAX_GUIDES } from "../lib/content/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_CONFIG.canonicalDomain}`,
      lastModified: new Date("2025-12-01T00:00:00Z"),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-calculators`,
      lastModified: new Date("2025-11-20T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-calculators/income-tax`,
      lastModified: new Date("2025-11-20T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-calculators/self-employed`,
      lastModified: new Date("2025-11-20T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-calculators/1099`,
      lastModified: new Date("2025-11-20T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-calculators/quarterly-tax`,
      lastModified: new Date("2025-11-20T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-calculators/2025-federal-income-tax-calculator`,
      lastModified: new Date("2025-11-20T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-calculators/2026-federal-income-tax-calculator`,
      lastModified: new Date("2025-11-20T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-guides`,
      lastModified: new Date("2025-11-29T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/blog`,
      lastModified: new Date("2025-12-01T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/ai-tax-assistant`,
      lastModified: new Date("2025-11-15T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/pricing`,
      lastModified: new Date("2025-11-15T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/about`,
      lastModified: new Date("2025-11-15T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/contact`,
      lastModified: new Date("2025-11-15T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-professionals`,
      lastModified: new Date("2025-11-15T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/tax-resources`,
      lastModified: new Date("2025-11-15T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/faq`,
      lastModified: new Date("2025-11-15T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/privacy`,
      lastModified: new Date("2025-10-01T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/terms`,
      lastModified: new Date("2025-10-01T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_CONFIG.canonicalDomain}/disclaimer`,
      lastModified: new Date("2025-10-01T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  const articleRoutes: MetadataRoute.Sitemap = TAX_ARTICLES.map((article) => ({
    url: `${SITE_CONFIG.canonicalDomain}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt || article.publishedAt),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  const guideRoutes: MetadataRoute.Sitemap = TAX_GUIDES.map((guide) => ({
    url: `${SITE_CONFIG.canonicalDomain}/tax-guides/${guide.slug}`,
    lastModified: new Date(guide.updatedAt || guide.publishedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...articleRoutes, ...guideRoutes];
}
