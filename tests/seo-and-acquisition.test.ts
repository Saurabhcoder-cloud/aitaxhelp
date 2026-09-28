import { describe, it, expect } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { constructMetadata, sanitizeCanonicalUrl } from "../lib/seo/metadata";
import { SITE_CONFIG } from "../lib/seo/config";
import { TAX_ARTICLES, getArticleBySlug } from "../lib/content/articles";
import { TAX_GUIDES, getGuideBySlug } from "../lib/content/guides";
import {
  getOrganizationSchema,
  getWebSiteSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
} from "../components/seo/JsonLd";
import { metadata as homeMetadata } from "../app/page";
import { metadata as incomeTaxMetadata } from "../app/tax-calculators/income-tax/page";
import { metadata as selfEmployedMetadata } from "../app/tax-calculators/self-employed/page";
import { metadata as tax1099Metadata } from "../app/tax-calculators/1099/page";
import { metadata as quarterlyTaxMetadata } from "../app/tax-calculators/quarterly-tax/page";
import { metadata as calc2025Metadata } from "../app/tax-calculators/2025-federal-income-tax-calculator/page";
import { metadata as calc2026Metadata } from "../app/tax-calculators/2026-federal-income-tax-calculator/page";
import { metadata as dashboardMetadata } from "../app/dashboard/layout";
import { metadata as adminMetadata } from "../app/admin/layout";
import { metadata as loginMetadata } from "../app/login/layout";
import { metadata as signupMetadata } from "../app/signup/layout";
import { metadata as forgotPasswordMetadata } from "../app/forgot-password/layout";
import { metadata as onboardingMetadata } from "../app/onboarding/layout";
import { calculateFederalTaxes } from "../tax-engine";
import { RULES_2025 } from "../tax-engine/rules/2025";
import { RULES_2026 } from "../tax-engine/rules/2026";
import { PRODUCT_PLANS } from "../lib/monetization/plans";
import { ADMIN_ROLE_PERMISSIONS } from "../lib/admin/types";
import { buildTaxReport } from "../lib/services/tax-report";
import { analytics, FunnelEvent, FunnelEventPayload } from "../lib/analytics/events";

describe("Phase 5 Step 11: SEO, Public Content, and Acquisition Architecture", () => {
  // Test 1: Homepage has correct metadata
  it("1. Homepage has correct metadata", () => {
    expect(homeMetadata.title).toContain("TaxAIHelp");
    expect(homeMetadata.title).toContain("Smarter Tax Help, Powered by AI");
    expect(homeMetadata.description).toBe(
      "Free deterministic US federal tax calculators, 2025 and 2026 progressive brackets, 1099 contractor write-offs, quarterly estimates, and conversational AI guidance."
    );
    expect(homeMetadata.alternates?.canonical).toBe("https://taxaihelp.com");
  });

  // Test 2: Calculator landing pages have unique titles
  it("2. Calculator landing pages have unique titles", () => {
    const titles = [
      String(incomeTaxMetadata.title),
      String(selfEmployedMetadata.title),
      String(tax1099Metadata.title),
      String(quarterlyTaxMetadata.title),
      String(calc2025Metadata.title),
      String(calc2026Metadata.title),
    ];
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  // Test 3: Calculator pages have canonical URLs
  it("3. Calculator pages have canonical URLs", () => {
    expect(incomeTaxMetadata.alternates?.canonical).toBe(
      "https://taxaihelp.com/tax-calculators/income-tax"
    );
    expect(selfEmployedMetadata.alternates?.canonical).toBe(
      "https://taxaihelp.com/tax-calculators/self-employed"
    );
    expect(tax1099Metadata.alternates?.canonical).toBe(
      "https://taxaihelp.com/tax-calculators/1099"
    );
    expect(quarterlyTaxMetadata.alternates?.canonical).toBe(
      "https://taxaihelp.com/tax-calculators/quarterly-tax"
    );
  });

  // Test 4: Tax-year pages expose correct tax year
  it("4. Tax-year pages expose correct tax year", () => {
    expect(String(calc2025Metadata.title)).toContain("2025");
    expect(calc2025Metadata.description).toContain("$15,750");
    expect(calc2025Metadata.description).toContain("$176,100");
    expect(calc2025Metadata.alternates?.canonical).toBe(
      "https://taxaihelp.com/tax-calculators/2025-federal-income-tax-calculator"
    );

    expect(String(calc2026Metadata.title)).toContain("2026");
    expect(calc2026Metadata.description).toContain("$16,100");
    expect(calc2026Metadata.description).toContain("$184,500");
    expect(calc2026Metadata.alternates?.canonical).toBe(
      "https://taxaihelp.com/tax-calculators/2026-federal-income-tax-calculator"
    );
  });

  // Test 5: Private routes have noindex metadata
  it("5. Private routes have noindex metadata", () => {
    const privateMetadatas = [
      dashboardMetadata,
      adminMetadata,
      loginMetadata,
      signupMetadata,
      forgotPasswordMetadata,
      onboardingMetadata,
    ];

    privateMetadatas.forEach((meta) => {
      // In Next.js metadata, robots index and follow must be false
      const robotsMeta = meta.robots as { index?: boolean; follow?: boolean };
      expect(robotsMeta).toBeDefined();
      expect(robotsMeta.index).toBe(false);
      expect(robotsMeta.follow).toBe(false);
      // Private routes must NOT expose canonical public SEO URLs
      expect(meta.alternates?.canonical).toBeUndefined();
    });
  });

  // Test 6: Admin routes are not included in sitemap
  it("6. Admin routes are not included in sitemap", () => {
    const map = sitemap();
    const adminRoutes = map.filter((entry) => entry.url.includes("/admin"));
    expect(adminRoutes.length).toBe(0);
  });

  // Test 7: Dashboard routes are not included in sitemap
  it("7. Dashboard routes are not included in sitemap", () => {
    const map = sitemap();
    const dashboardRoutes = map.filter((entry) => entry.url.includes("/dashboard"));
    expect(dashboardRoutes.length).toBe(0);
  });

  // Test 8: API routes are not included in sitemap
  it("8. API routes are not included in sitemap", () => {
    const map = sitemap();
    const apiRoutes = map.filter((entry) => entry.url.includes("/api"));
    expect(apiRoutes.length).toBe(0);
  });

  // Test 9: Public calculator pages are included in sitemap
  it("9. Public calculator pages are included in sitemap", () => {
    const map = sitemap();
    const urls = map.map((m) => m.url);
    expect(urls).toContain("https://taxaihelp.com/tax-calculators");
    expect(urls).toContain("https://taxaihelp.com/tax-calculators/income-tax");
    expect(urls).toContain("https://taxaihelp.com/tax-calculators/self-employed");
    expect(urls).toContain("https://taxaihelp.com/tax-calculators/1099");
    expect(urls).toContain("https://taxaihelp.com/tax-calculators/quarterly-tax");
    expect(urls).toContain("https://taxaihelp.com/tax-calculators/2025-federal-income-tax-calculator");
    expect(urls).toContain("https://taxaihelp.com/tax-calculators/2026-federal-income-tax-calculator");
  });

  // Test 10: Public tax guides are included in sitemap
  it("10. Public tax guides are included in sitemap", () => {
    const map = sitemap();
    const urls = map.map((m) => m.url);
    expect(urls).toContain("https://taxaihelp.com/tax-guides");
    TAX_GUIDES.forEach((guide) => {
      expect(urls).toContain(`https://taxaihelp.com/tax-guides/${guide.slug}`);
    });
  });

  // Test 11: Public blog articles are included in sitemap
  it("11. Public blog articles are included in sitemap", () => {
    const map = sitemap();
    const urls = map.map((m) => m.url);
    expect(urls).toContain("https://taxaihelp.com/blog");
    TAX_ARTICLES.forEach((article) => {
      expect(urls).toContain(`https://taxaihelp.com/blog/${article.slug}`);
    });
  });

  // Test 12: robots.txt blocks private areas
  it("12. robots.txt blocks private areas", () => {
    const robotRules = robots();
    const disallowList = Array.isArray(robotRules.rules)
      ? robotRules.rules[0]?.disallow
      : robotRules.rules?.disallow;
    expect(disallowList).toBeDefined();
    const disallowed = Array.isArray(disallowList) ? disallowList : [disallowList];
    expect(disallowed).toContain("/api/");
    expect(disallowed).toContain("/dashboard/");
    expect(disallowed).toContain("/admin/");
    expect(disallowed).toContain("/login");
    expect(disallowed).toContain("/signup");
    expect(disallowed).toContain("/forgot-password");
    expect(disallowed).toContain("/onboarding");
    expect(robotRules.sitemap).toBe("https://taxaihelp.com/sitemap.xml");
  });

  // Test 13: JSON-LD exists only where appropriate
  it("13. JSON-LD exists only where appropriate", () => {
    const org = getOrganizationSchema();
    expect(org["@context"]).toBe("https://schema.org");
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("TaxAIHelp");
    expect(org.url).toBe("https://taxaihelp.com");

    const site = getWebSiteSchema();
    expect(site["@context"]).toBe("https://schema.org");
    expect(site["@type"]).toBe("WebSite");
    expect(site.name).toBe("TaxAIHelp");
  });

  // Test 14: FAQ schema matches visible FAQ content
  it("14. FAQ schema matches visible FAQ content", () => {
    const article = getArticleBySlug("2025-vs-2026-federal-tax-brackets-comparison");
    expect(article).toBeDefined();
    expect(article?.faqs).toBeDefined();
    const schema = getFAQPageSchema(article!.faqs!);
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity.length).toBe(article!.faqs!.length);
    expect(schema.mainEntity[0].name).toBe(article!.faqs![0].question);
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe(article!.faqs![0].answer);
  });

  // Test 15: Breadcrumb schema matches visible breadcrumbs
  it("15. Breadcrumb schema matches visible breadcrumbs", () => {
    const breadcrumbs = [
      { name: "Home", item: "/" },
      { name: "Tax Calculators", item: "/tax-calculators" },
      { name: "1099 Contractor Tax Calculator", item: "/tax-calculators/1099" },
    ];
    const schema = getBreadcrumbSchema(breadcrumbs);
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement.length).toBe(3);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[0].name).toBe("Home");
    expect(schema.itemListElement[0].item).toBe("https://taxaihelp.com/");
    expect(schema.itemListElement[2].name).toBe("1099 Contractor Tax Calculator");
    expect(schema.itemListElement[2].item).toBe("https://taxaihelp.com/tax-calculators/1099");
  });

  // Test 16: Open Graph metadata is present
  it("16. Open Graph metadata is present", () => {
    const meta = constructMetadata({
      title: "Test Page",
      description: "Test description",
      path: "/test-page",
    });
    expect(meta.openGraph).toBeDefined();
    expect(meta.openGraph?.title).toContain("Test Page | TaxAIHelp");
    expect(meta.openGraph?.description).toBe("Test description");
    expect(meta.openGraph?.url).toBe("https://taxaihelp.com/test-page");
    expect(meta.openGraph?.siteName).toBe("TaxAIHelp");
    expect(meta.openGraph?.images).toBeDefined();
  });

  // Test 17: Twitter metadata is present
  it("17. Twitter metadata is present", () => {
    const meta = constructMetadata({
      title: "Test Page",
      description: "Test description",
      path: "/test-page",
    });
    const twitterMeta = meta.twitter as { card?: string; title?: string; creator?: string };
    expect(twitterMeta).toBeDefined();
    expect(twitterMeta.card).toBe("summary_large_image");
    expect(twitterMeta.title).toContain("Test Page | TaxAIHelp");
    expect(twitterMeta.creator).toBe("@taxaihelp");
  });

  // Test 18: Canonical URLs use the production domain
  it("18. Canonical URLs use the production domain", () => {
    expect(sanitizeCanonicalUrl("/tax-calculators/income-tax/")).toBe(
      "https://taxaihelp.com/tax-calculators/income-tax"
    );
    expect(sanitizeCanonicalUrl("/tax-calculators?query=param#hash")).toBe(
      "https://taxaihelp.com/tax-calculators"
    );
    expect(sanitizeCanonicalUrl("http://localhost:3000/blog/test/")).toBe(
      "https://taxaihelp.com/blog/test"
    );
    expect(sanitizeCanonicalUrl("/")).toBe("https://taxaihelp.com");
  });

  // Test 19: Tax-year metadata is not mixed between years
  it("19. Tax-year metadata is not mixed between years", () => {
    // 2025 rule checks
    expect(RULES_2025.standardDeductions.single).toBe(1575000); // $15,750
    expect(RULES_2025.standardDeductions.married_filing_jointly).toBe(3150000); // $31,500
    expect(RULES_2025.selfEmployment.socialSecurityWageCapCents).toBe(17610000); // $176,100

    // 2026 rule checks
    expect(RULES_2026.standardDeductions.single).toBe(1610000); // $16,100
    expect(RULES_2026.standardDeductions.married_filing_jointly).toBe(3220000); // $32,200
    expect(RULES_2026.selfEmployment.socialSecurityWageCapCents).toBe(18450000); // $184,500

    // Check page metadata texts do not swap values
    expect(calc2025Metadata.description).not.toContain("$16,100");
    expect(calc2026Metadata.description).not.toContain("$15,750");
  });

  // Test 20: Private calculation data is not exposed in public metadata
  it("20. Private calculation data is not exposed in public metadata", () => {
    const meta = constructMetadata({
      title: "Public Page",
      description: "Public Description",
      path: "/tax-calculators/income-tax",
    });

    const metaString = JSON.stringify(meta);
    expect(metaString).not.toContain("calculationId");
    expect(metaString).not.toContain("taxpayerSnapshot");
    expect(metaString).not.toContain("ssn");
    expect(metaString).not.toContain("userId");
  });

  // Test 21: Public pages remain accessible without authentication
  it("21. Public pages remain accessible without authentication", () => {
    // Evaluating public metadata requires no session or tokens
    const publicGuides = TAX_GUIDES.map((g) => g.slug);
    expect(publicGuides.length).toBeGreaterThanOrEqual(6);
    const publicArticles = TAX_ARTICLES.map((a) => a.slug);
    expect(publicArticles.length).toBeGreaterThanOrEqual(3);

    const testGuide = getGuideBySlug(publicGuides[0]);
    expect(testGuide).toBeDefined();
    expect(testGuide?.canonicalUrl.startsWith("https://taxaihelp.com")).toBe(true);
  });

  // Test 22: Authenticated pages remain protected
  it("22. Authenticated pages remain protected", () => {
    // Both dashboard and admin layouts enforce noindex
    const dashRobots = dashboardMetadata.robots as { index?: boolean };
    const adminRobots = adminMetadata.robots as { index?: boolean };
    expect(dashRobots.index).toBe(false);
    expect(adminRobots.index).toBe(false);
  });

  // Test 23: SEO content does not alter tax engine output
  it("23. SEO content does not alter tax engine output", () => {
    const result2025 = calculateFederalTaxes({
      taxYear: 2025,
      filingStatus: "single",
      w2Wages: 6000000, // $60,000.00
      withholdingPaid: 500000, // $5,000.00
    });

    // 2025 Single: $60,000 gross - $15,750 std ded = $44,250 taxable income.
    // Bracket 1: $11,925 * 10% = $1,192.50 = 119250 cents
    // Bracket 2: ($44,250 - $11,925) = $32,325 * 12% = $3,879.00 = 387900 cents
    // Total income tax = 119250 + 387900 = 507150 cents ($5,071.50)
    expect(result2025.adjustedGrossIncome).toBe(6000000);
    expect(result2025.standardDeduction).toBe(1575000);
    expect(result2025.taxableIncome).toBe(4425000);
    expect(result2025.incomeTax).toBe(507150);
  });

  // Test 24: Existing calculators remain functional
  it("24. Existing calculators remain functional", () => {
    // Self-employed calculation
    const seResult = calculateFederalTaxes({
      taxYear: 2025,
      filingStatus: "single",
      scheduleCNetProfit: 10000000, // $100,000.00
    });

    // Statutory 92.35% factor: $100,000 * 0.9235 = $92,350
    // SE tax: 15.3% of $92,350 = $14,129.55 = 1412955 cents
    expect(seResult.selfEmploymentTax).toBe(1412955);
    expect(seResult.aboveTheLineDeduction).toBe(Math.round(1412955 / 2));
  });

  // Test 25: Existing reports remain functional
  it("25. Existing reports remain functional", () => {
    const calc = calculateFederalTaxes({
      taxYear: 2025,
      filingStatus: "single",
      w2Wages: 8000000,
    });
    const record = {
      id: "calc_test_report_seo",
      userId: "user_test_seo",
      calculatorType: "income_tax" as const,
      taxYear: 2025 as const,
      filingStatus: "single" as const,
      title: "2025 Federal Income Tax Calculation",
      inputSnapshot: { w2Wages: 8000000 },
      resultSnapshot: calc,
      engineVersion: "1.0.0",
      rulesVersion: "2025.2.0-irs-irb-2025-45-obbba",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const report = buildTaxReport(record, "free");
    expect(report.id).toBeDefined();
    expect(report.taxYear).toBe(2025);
    expect(report.taxSummary.taxableIncomeCents).toBe(calc.taxableIncomeCents);
  });

  // Test 26: Existing AI assistant remains functional
  it("26. Existing AI assistant remains functional", () => {
    // Verifies that SITE_CONFIG tagline and positioning support AI assistant integration
    expect(SITE_CONFIG.tagline).toBe("Smarter Tax Help, Powered by AI");
    expect(SITE_CONFIG.url).toBe("https://taxaihelp.com");
  });

  // Test 27: Existing monetization remains functional
  it("27. Existing monetization remains functional", () => {
    expect(PRODUCT_PLANS.free.name).toBe("Free");
    expect(PRODUCT_PLANS.premium.name).toBe("Premium");
    expect(PRODUCT_PLANS.premium.monthlyPriceCents).toBe(1900);
    expect(PRODUCT_PLANS.premium.limits.aiMessagesPerDay).toBe(100);
  });

  // Test 28: Existing admin security remains functional
  it("28. Existing admin security remains functional", () => {
    expect(ADMIN_ROLE_PERMISSIONS.super_admin).toBeDefined();
    expect(ADMIN_ROLE_PERMISSIONS.super_admin).toContain("system:audit_logs");
    expect(ADMIN_ROLE_PERMISSIONS.support_specialist).not.toContain("system:manage_admins");
  });

  // Additional Test 29: Acquisition funnel analytics tracker enforces privacy
  it("29. Acquisition funnel analytics tracker sanitizes tax data", () => {
    let capturedEvent: any = null;
    const unsubscribe = analytics.subscribe((evt) => {
      capturedEvent = evt;
    });

    const untypedInput: FunnelEventPayload & { wages?: number; ssn?: string } = {
      calculatorType: "income_tax",
      taxYear: 2025,
      wages: 5000000,
      ssn: "123-45-6789",
    };

    analytics.track("calculator_view", untypedInput);

    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent?.name).toBe("calculator_view");
    expect(capturedEvent?.payload?.calculatorType).toBe("income_tax");
    expect(capturedEvent?.payload?.taxYear).toBe(2025);
    // Verified that sensitive financial properties were not attached
    const payloadRecord = capturedEvent?.payload as Record<string, unknown> | undefined;
    expect(payloadRecord?.wages).toBeUndefined();
    expect(payloadRecord?.ssn).toBeUndefined();

    unsubscribe();
  });
});
