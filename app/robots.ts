import { MetadataRoute } from "next";
import { SITE_CONFIG } from "../lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/admin/",
        "/login",
        "/signup",
        "/forgot-password",
        "/onboarding",
      ],
    },
    sitemap: `${SITE_CONFIG.canonicalDomain}/sitemap.xml`,
  };
}
