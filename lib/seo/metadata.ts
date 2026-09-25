import { Metadata } from "next";
import { SITE_CONFIG } from "./config";

interface MetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
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
}: MetadataOptions = {}): Metadata {
  const fullTitle = title
    ? `${title} | ${SITE_CONFIG.name}`
    : `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;

  const canonicalUrl = `${SITE_CONFIG.url}${path.startsWith("/") ? path : `/${path}`}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE_CONFIG.url),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      locale: "en_US",
      type: ogType,
      images: [
        {
          url: `${SITE_CONFIG.url}/images/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: SITE_CONFIG.twitterHandle,
      images: [`${SITE_CONFIG.url}/images/og-image.png`],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
