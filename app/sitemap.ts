import { MetadataRoute } from "next";
import { SITE_CONFIG } from "../lib/seo/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/tax-calculators",
    "/tax-calculators/income-tax",
    "/tax-calculators/self-employed",
    "/tax-calculators/1099",
    "/tax-calculators/quarterly-tax",
    "/ai-tax-assistant",
    "/tax-resources",
    "/tax-professionals",
    "/pricing",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/disclaimer",
  ];

  const now = new Date();

  return routes.map((route) => ({
    url: `${SITE_CONFIG.url}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route.includes("calculator") ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route.includes("calculator") ? 0.9 : 0.7,
  }));
}
