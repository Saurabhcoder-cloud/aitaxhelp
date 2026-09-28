import { IncidentSeverity, ServiceId, ServiceTarget } from "@/types/operations";

/**
 * Internal Operational Service Targets (Phase 5 Step 19)
 *
 * DEFINITION OF INTENT:
 * These figures represent INTERNAL ENGINEERING TARGETS, NOT contractual guarantees or public SLAs.
 * The application strictly distinguishes between TARGET and MEASURED RESULT.
 */

export const INCIDENT_RESPONSE_TARGETS: Record<IncidentSeverity, { ackMinutes: number; updateMinutes: number; description: string }> = {
  SEV1: {
    ackMinutes: 15,
    updateMinutes: 30,
    description: "Critical outage affecting deterministic calculations or complete site availability.",
  },
  SEV2: {
    ackMinutes: 30,
    updateMinutes: 60,
    description: "Major feature impairment (e.g. AI guidance, billing checkout, or reports down).",
  },
  SEV3: {
    ackMinutes: 240, // 4 hours
    updateMinutes: 480,
    description: "Moderate operational issue with functional workaround available.",
  },
  SEV4: {
    ackMinutes: 1440, // 24 hours / 1 business day
    updateMinutes: 2880,
    description: "Minor defect or cosmetic anomaly not impeding taxpayer workflows.",
  },
};

export const SERVICE_TARGETS: Record<ServiceId, ServiceTarget> = {
  TAX_ENGINE: {
    serviceId: "TAX_ENGINE",
    name: "Deterministic Federal Tax Engine",
    targetAvailability: "99.99%",
    targetLatency: "< 25ms",
    incidentAckTargetMinutes: { SEV1: 15, SEV2: 30, SEV3: 240, SEV4: 1440 },
    notes: "Core statutory calculations require maximum precision and continuous availability.",
  },
  CALCULATORS: {
    serviceId: "CALCULATORS",
    name: "Tax Calculator Workflows",
    targetAvailability: "99.95%",
    targetLatency: "< 500ms",
    incidentAckTargetMinutes: { SEV1: 15, SEV2: 30, SEV3: 240, SEV4: 1440 },
    notes: "Interactive user calculation workflows.",
  },
  DATABASE: {
    serviceId: "DATABASE",
    name: "Supabase Relational Database",
    targetAvailability: "99.95%",
    targetLatency: "< 100ms",
    incidentAckTargetMinutes: { SEV1: 15, SEV2: 30, SEV3: 240, SEV4: 1440 },
    notes: "Underlying storage tier for accounts, calculations, and subscriptions.",
  },
  AUTHENTICATION: {
    serviceId: "AUTHENTICATION",
    name: "Authentication & Session Gateway",
    targetAvailability: "99.95%",
    targetLatency: "< 200ms",
    incidentAckTargetMinutes: { SEV1: 15, SEV2: 30, SEV3: 240, SEV4: 1440 },
    notes: "User sign-in and session security validation.",
  },
  AI_ASSISTANT: {
    serviceId: "AI_ASSISTANT",
    name: "AI Tax Guidance Assistant",
    targetAvailability: "99.5%",
    targetLatency: "< 3500ms",
    incidentAckTargetMinutes: { SEV1: 30, SEV2: 60, SEV3: 240, SEV4: 1440 },
    notes: "Non-authoritative conversational tax guidance.",
  },
  TAX_REPORTS: {
    serviceId: "TAX_REPORTS",
    name: "Tax Summary & PDF Reports",
    targetAvailability: "99.9%",
    targetLatency: "< 800ms",
    incidentAckTargetMinutes: { SEV1: 30, SEV2: 60, SEV3: 240, SEV4: 1440 },
    notes: "Multi-scenario calculation report generation.",
  },
  BILLING: {
    serviceId: "BILLING",
    name: "Stripe Subscription Checkout",
    targetAvailability: "99.9%",
    targetLatency: "< 1000ms",
    incidentAckTargetMinutes: { SEV1: 30, SEV2: 60, SEV3: 240, SEV4: 1440 },
    notes: "Monetization and subscription tier management.",
  },
  STRIPE_WEBHOOKS: {
    serviceId: "STRIPE_WEBHOOKS",
    name: "Stripe Billing Webhooks",
    targetAvailability: "99.9%",
    targetLatency: "< 500ms",
    incidentAckTargetMinutes: { SEV1: 30, SEV2: 60, SEV3: 240, SEV4: 1440 },
    notes: "Payment reconciliation webhooks.",
  },
  APPLICATION: {
    serviceId: "APPLICATION",
    name: "Next.js Core Application Host",
    targetAvailability: "99.9%",
    targetLatency: "< 300ms",
    incidentAckTargetMinutes: { SEV1: 15, SEV2: 30, SEV3: 240, SEV4: 1440 },
    notes: "Overall web routing and server components.",
  },
  NOTIFICATIONS: {
    serviceId: "NOTIFICATIONS",
    name: "In-App Notification Center",
    targetAvailability: "99.9%",
    targetLatency: "< 200ms",
    incidentAckTargetMinutes: { SEV1: 60, SEV2: 120, SEV3: 240, SEV4: 1440 },
    notes: "In-app notifications for ticket updates and reports.",
  },
  EMAIL: {
    serviceId: "EMAIL",
    name: "Transactional Email Delivery",
    targetAvailability: "99.0%",
    targetLatency: "< 2000ms",
    incidentAckTargetMinutes: { SEV1: 60, SEV2: 120, SEV3: 240, SEV4: 1440 },
    notes: "Outbound transactional emails.",
  },
  SUPPORT: {
    serviceId: "SUPPORT",
    name: "Customer Support Center",
    targetAvailability: "99.5%",
    targetLatency: "< 400ms",
    incidentAckTargetMinutes: { SEV1: 60, SEV2: 120, SEV3: 240, SEV4: 1440 },
    notes: "Support ticket queue and feedback collection.",
  },
  PROFESSIONAL_HANDOFF: {
    serviceId: "PROFESSIONAL_HANDOFF",
    name: "CPA / Enrolled Agent Handoff",
    targetAvailability: "99.0%",
    targetLatency: "< 500ms",
    incidentAckTargetMinutes: { SEV1: 60, SEV2: 120, SEV3: 240, SEV4: 1440 },
    notes: "Partner lead intake and routing.",
  },
  BACKUP: {
    serviceId: "BACKUP",
    name: "Database Backup Subsystem",
    targetAvailability: "99.9%",
    targetLatency: "N/A",
    incidentAckTargetMinutes: { SEV1: 30, SEV2: 60, SEV3: 240, SEV4: 1440 },
    notes: "Continuous snapshot availability and RPO monitoring.",
  },
  RESTORE: {
    serviceId: "RESTORE",
    name: "Restore Verification Engine",
    targetAvailability: "99.0%",
    targetLatency: "N/A",
    incidentAckTargetMinutes: { SEV1: 60, SEV2: 120, SEV3: 240, SEV4: 1440 },
    notes: "Simulated recovery verification drills.",
  },
  SEARCH_SEO: {
    serviceId: "SEARCH_SEO",
    name: "Public SEO & Sitemap Generation",
    targetAvailability: "99.9%",
    targetLatency: "< 150ms",
    incidentAckTargetMinutes: { SEV1: 120, SEV2: 240, SEV3: 480, SEV4: 1440 },
    notes: "Organic search acquisition and guide rendering.",
  },
  SEO: {
    serviceId: "SEO",
    name: "Search Engine Optimization & Public Acquisition",
    targetAvailability: "99.9%",
    targetLatency: "< 150ms",
    incidentAckTargetMinutes: { SEV1: 120, SEV2: 240, SEV3: 480, SEV4: 1440 },
    notes: "Organic search acquisition and discovery pipeline.",
  },
  ADMIN: {
    serviceId: "ADMIN",
    name: "Administrative Operations Portal",
    targetAvailability: "99.5%",
    targetLatency: "< 500ms",
    incidentAckTargetMinutes: { SEV1: 30, SEV2: 60, SEV3: 240, SEV4: 1440 },
    notes: "Admin control plane.",
  },
  CI_CD: {
    serviceId: "CI_CD",
    name: "Continuous Integration & Deployment",
    targetAvailability: "98.0%",
    targetLatency: "N/A",
    incidentAckTargetMinutes: { SEV1: 120, SEV2: 240, SEV3: 480, SEV4: 1440 },
    notes: "GitHub Actions automated testing and packaging.",
  },
};

export function getServiceTarget(serviceId: ServiceId): ServiceTarget | undefined {
  return SERVICE_TARGETS[serviceId];
}

export function getIncidentResponseTarget(severity: IncidentSeverity): {
  ackMinutes: number;
  updateMinutes: number;
  description: string;
} {
  return INCIDENT_RESPONSE_TARGETS[severity];
}
