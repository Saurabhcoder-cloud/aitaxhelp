import { ServiceCatalogItem, ServiceId, ServiceCriticality, SERVICE_IDS } from "@/types/operations";

/**
 * Production Service Catalog (Phase 5 Step 19)
 *
 * Inventories all 18 platform services with criticality, dependency references,
 * and operational service targets.
 *
 * INVARIANT: Target availability and target latency are internal operational targets,
 * NOT empirical claims of current performance.
 */
export const SERVICE_CATALOG: Record<ServiceId, ServiceCatalogItem> = {
  TAX_ENGINE: {
    id: "TAX_ENGINE",
    name: "Deterministic Federal Tax Engine",
    criticality: "CRITICAL",
    owner: "Tax Architecture Team",
    dependencies: [],
    targetAvailabilityPercent: 99.99,
    targetLatencyMs: 15,
    impactsCoreTaxMath: true,
    description: "Self-contained statutory calculation engine for Form 1040, brackets, and Schedule C.",
  },
  CALCULATORS: {
    id: "CALCULATORS",
    name: "Tax Calculator Workflows",
    criticality: "CRITICAL",
    owner: "Product Engineering",
    dependencies: ["TAX_ENGINE", "DATABASE"],
    targetAvailabilityPercent: 99.9,
    targetLatencyMs: 250,
    impactsCoreTaxMath: true,
    description: "Interactive calculators for Federal Income, Self-Employed, 1099, and Quarterly taxes.",
  },
  DATABASE: {
    id: "DATABASE",
    name: "Supabase Relational Database",
    criticality: "CRITICAL",
    owner: "Infrastructure & Data Team",
    dependencies: [],
    healthEndpoint: "/api/health/readiness",
    targetAvailabilityPercent: 99.95,
    targetLatencyMs: 100,
    impactsCoreTaxMath: false, // Core engine can run client-side/offline without persistence
    description: "PostgreSQL cluster for user accounts, calculation histories, subscriptions, and tickets.",
  },
  AUTHENTICATION: {
    id: "AUTHENTICATION",
    name: "Authentication & Session Gateway",
    criticality: "CRITICAL",
    owner: "Security Engineering",
    dependencies: ["DATABASE"],
    healthEndpoint: "/api/v1/auth/session",
    targetAvailabilityPercent: 99.95,
    targetLatencyMs: 150,
    impactsCoreTaxMath: false,
    description: "User sign-in, session tokens, secure cookies, and password recovery.",
  },
  AI_ASSISTANT: {
    id: "AI_ASSISTANT",
    name: "AI Tax Guidance Assistant",
    criticality: "HIGH",
    owner: "AI Engineering",
    dependencies: ["AUTHENTICATION", "DATABASE"],
    healthEndpoint: "/api/health/readiness",
    targetAvailabilityPercent: 99.5,
    targetLatencyMs: 3000,
    impactsCoreTaxMath: false, // Non-authoritative explanatory assistant
    description: "Google Gemini conversational guidance for contextual tax questions.",
  },
  TAX_REPORTS: {
    id: "TAX_REPORTS",
    name: "Tax Summary & PDF Reports",
    criticality: "HIGH",
    owner: "Product Engineering",
    dependencies: ["TAX_ENGINE", "AUTHENTICATION", "DATABASE"],
    targetAvailabilityPercent: 99.9,
    targetLatencyMs: 500,
    impactsCoreTaxMath: true,
    description: "Comprehensive multi-scenario calculation reports and PDF-ready summaries.",
  },
  BILLING: {
    id: "BILLING",
    name: "Stripe Subscription Checkout",
    criticality: "HIGH",
    owner: "Growth & Monetization",
    dependencies: ["AUTHENTICATION", "DATABASE", "STRIPE_WEBHOOKS"],
    targetAvailabilityPercent: 99.9,
    targetLatencyMs: 800,
    impactsCoreTaxMath: false,
    description: "Tiered subscription checkouts, pricing plans, and portal sessions.",
  },
  STRIPE_WEBHOOKS: {
    id: "STRIPE_WEBHOOKS",
    name: "Stripe Billing Webhooks",
    criticality: "HIGH",
    owner: "Growth & Monetization",
    dependencies: ["DATABASE"],
    targetAvailabilityPercent: 99.9,
    targetLatencyMs: 300,
    impactsCoreTaxMath: false,
    description: "Asynchronous subscription lifecycle and invoice event reconciliation.",
  },
  APPLICATION: {
    id: "APPLICATION",
    name: "Next.js Core Application Host",
    criticality: "NORMAL",
    owner: "Platform Engineering",
    dependencies: [],
    healthEndpoint: "/api/health",
    targetAvailabilityPercent: 99.9,
    targetLatencyMs: 200,
    impactsCoreTaxMath: false,
    description: "Next.js App Router server, routing layer, and server-side rendering.",
  },
  NOTIFICATIONS: {
    id: "NOTIFICATIONS",
    name: "In-App Notification Center",
    criticality: "NORMAL",
    owner: "Platform Engineering",
    dependencies: ["DATABASE"],
    targetAvailabilityPercent: 99.9,
    targetLatencyMs: 150,
    impactsCoreTaxMath: false,
    description: "In-app notifications for ticket updates, reports, and system broadcasts.",
  },
  EMAIL: {
    id: "EMAIL",
    name: "Transactional Email Delivery",
    criticality: "NORMAL",
    owner: "Platform Engineering",
    dependencies: [],
    targetAvailabilityPercent: 99.0,
    targetLatencyMs: 1500,
    impactsCoreTaxMath: false,
    description: "Outbound transactional emails for password resets and ticket notifications.",
  },
  SUPPORT: {
    id: "SUPPORT",
    name: "Customer Support Center",
    criticality: "NORMAL",
    owner: "Support Operations",
    dependencies: ["AUTHENTICATION", "DATABASE", "NOTIFICATIONS"],
    targetAvailabilityPercent: 99.5,
    targetLatencyMs: 300,
    impactsCoreTaxMath: false,
    description: "Ticket intake, user replies, staff internal notes, and user satisfaction ratings.",
  },
  PROFESSIONAL_HANDOFF: {
    id: "PROFESSIONAL_HANDOFF",
    name: "CPA / Enrolled Agent Handoff",
    criticality: "NORMAL",
    owner: "Partnerships",
    dependencies: ["AUTHENTICATION", "DATABASE", "NOTIFICATIONS"],
    targetAvailabilityPercent: 99.0,
    targetLatencyMs: 400,
    impactsCoreTaxMath: false,
    description: "Lead intake and partner routing for professional tax consultation inquiries.",
  },
  BACKUP: {
    id: "BACKUP",
    name: "Database Backup Subsystem",
    criticality: "NORMAL",
    owner: "Infrastructure & Data Team",
    dependencies: ["DATABASE"],
    healthEndpoint: "/api/v1/admin/data-health/backup",
    targetAvailabilityPercent: 99.9,
    impactsCoreTaxMath: false,
    description: "Automated snapshot generation and recovery point tracking.",
  },
  RESTORE: {
    id: "RESTORE",
    name: "Restore Verification Engine",
    criticality: "NORMAL",
    owner: "Infrastructure & Data Team",
    dependencies: ["DATABASE", "BACKUP"],
    healthEndpoint: "/api/v1/admin/data-health/recovery",
    targetAvailabilityPercent: 99.0,
    impactsCoreTaxMath: false,
    description: "Non-destructive simulated recovery drills validating schema restoration.",
  },
  SEARCH_SEO: {
    id: "SEARCH_SEO",
    name: "Public SEO & Sitemap Generation",
    criticality: "NORMAL",
    owner: "Growth Lead",
    dependencies: ["APPLICATION"],
    targetAvailabilityPercent: 99.9,
    targetLatencyMs: 100,
    impactsCoreTaxMath: false,
    description: "Static blog, tax guides, sitemap.xml, robots.txt, and metadata rendering.",
  },
  SEO: {
    id: "SEO",
    name: "Search Engine Optimization & Public Acquisition",
    criticality: "NORMAL",
    owner: "Growth Lead",
    dependencies: ["APPLICATION"],
    targetAvailabilityPercent: 99.9,
    targetLatencyMs: 100,
    impactsCoreTaxMath: false,
    description: "Search engine acquisition, metadata, sitemaps, and public guide discovery.",
  },
  ADMIN: {
    id: "ADMIN",
    name: "Administrative Operations Portal",
    criticality: "CRITICAL",
    owner: "Security & Operations",
    dependencies: ["AUTHENTICATION", "DATABASE"],
    healthEndpoint: "/api/v1/admin/operations",
    targetAvailabilityPercent: 99.5,
    targetLatencyMs: 300,
    impactsCoreTaxMath: false,
    description: "System health, configuration controls, audit log, data health, and deployment readiness.",
  },
  CI_CD: {
    id: "CI_CD",
    name: "Continuous Integration & Deployment",
    criticality: "LOW",
    owner: "DevOps",
    dependencies: [],
    targetAvailabilityPercent: 98.0,
    impactsCoreTaxMath: false,
    description: "GitHub Actions workflow for typecheck, linting, tests, and build packaging.",
  },
};

// Ensure all catalog items have serviceId and displayName compatibility fields
for (const item of Object.values(SERVICE_CATALOG)) {
  item.serviceId = item.id;
  item.displayName = item.name;
}

export { SERVICE_IDS };

export function isCoreTaxService(id: ServiceId): boolean {
  return SERVICE_CATALOG[id]?.impactsCoreTaxMath === true;
}

export function getServiceMetadata(id: ServiceId): ServiceCatalogItem {
  return SERVICE_CATALOG[id];
}

export function getServiceCatalogList(): ServiceCatalogItem[] {
  return Object.values(SERVICE_CATALOG);
}

export function getServiceCatalogItem(id: ServiceId): ServiceCatalogItem {
  return SERVICE_CATALOG[id];
}
