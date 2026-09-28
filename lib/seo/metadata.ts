import { Metadata } from "next";
import { SITE_CONFIG } from "./config";

export interface MetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  canonicalUrl?: string;
}

/**
 * Sanitizes and normalizes a path or URL into a strict canonical URL on the production domain.
 * - Strips query parameters
 * - Strips URL fragments / hash
 * - Strips trailing slashes (except root)
 * - Forces canonical domain https://taxaihelp.com
 */
export function sanitizeCanonicalUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return SITE_CONFIG.canonicalDomain;
  let path = pathOrUrl;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      path = u.pathname;
    } catch {
      path = "/";
    }
  }

  // Strip query string and fragment
  path = path.split("?")[0].split("#")[0];

  // Ensure leading slash
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // Remove trailing slash if length > 1 (e.g. /tax-calculators/ -> /tax-calculators)
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return `${SITE_CONFIG.canonicalDomain}${path === "/" ? "" : path}`;
}

/**
 * Constructs standard, accessible, and canonical SEO metadata for Next.js pages.
 */
export function constructMetadata({
  title,
  description = SITE_CONFIG.description,
  path = "",
  noIndex = false,
  ogType = "website",
  publishedTime,
  modifiedTime,
  authors,
  canonicalUrl,
}: MetadataOptions = {}): Metadata {
  const fullTitle = title
    ? `${title} | ${SITE_CONFIG.name}`
    : `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;

  const canonical = sanitizeCanonicalUrl(canonicalUrl || path);

  const baseOpenGraph = {
    title: fullTitle,
    description,
    url: noIndex ? undefined : canonical,
    siteName: SITE_CONFIG.name,
    locale: "en_US",
    images: [
      {
        url: `${SITE_CONFIG.canonicalDomain}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
      },
    ],
  };

  const openGraph: Metadata["openGraph"] =
    ogType === "article"
      ? {
          ...baseOpenGraph,
          type: "article",
          publishedTime,
          modifiedTime,
          authors,
        }
      : {
          ...baseOpenGraph,
          type: "website",
        };

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE_CONFIG.canonicalDomain),
    alternates: noIndex
      ? undefined
      : {
          canonical,
        },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: SITE_CONFIG.twitterHandle,
      images: [`${SITE_CONFIG.canonicalDomain}/images/og-image.png`],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            "max-video-preview": -1,
            "max-image-preview": "none",
            "max-snippet": -1,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}
