/**
 * Lightweight, privacy-first event tracking abstraction for public acquisition funnel.
 *
 * CRITICAL PRIVACY INVARIANTS:
 * 1. NEVER track sensitive tax values (wages, deductions, liabilities, refund amounts).
 * 2. NEVER send calculation snapshots, SSNs, EINs, or user conversation text to analytics.
 * 3. Only track high-level funnel progression and metadata (e.g. calculator type, tax year).
 */

import { CalculatorType } from "@/types/tax";

export type FunnelEventName =
  | "calculator_view"
  | "calculator_started"
  | "calculation_completed"
  | "signup_started"
  | "signup_completed"
  | "report_viewed"
  | "pricing_viewed"
  | "upgrade_clicked"
  | "professional_handoff_started"
  | "professional_handoff_submitted";

export interface FunnelEventPayload {
  calculatorType?: CalculatorType | "income-tax" | "self-employed" | "quarterly-tax";
  taxYear?: 2025 | 2026;
  plan?: "free" | "premium";
  interval?: "monthly" | "annual";
  source?: string;
  hasWithholding?: boolean;
}

export interface FunnelEvent {
  name: FunnelEventName;
  payload?: FunnelEventPayload;
  timestamp: string;
}

// Prohibited keys that represent sensitive financial, tax, or personal information
export const SENSITIVE_KEY_BLACKLIST: readonly string[] = [
  "wages",
  "income",
  "grossincome",
  "netprofit",
  "taxableincome",
  "deductions",
  "taxliability",
  "liability",
  "refund",
  "balancedue",
  "bank",
  "ssn",
  "ein",
  "address",
  "snapshot",
  "inputsnapshot",
  "resultsnapshot",
  "conversation",
  "messages",
  "internalnotes",
  "notes",
  "password",
  "token",
];

/**
 * Checks whether an arbitrary object contains any prohibited sensitive tax keys.
 */
export function containsSensitiveTaxData(obj: Record<string, unknown>): boolean {
  for (const key of Object.keys(obj)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, "");
    if (SENSITIVE_KEY_BLACKLIST.some((blacklisted) => normalizedKey.includes(blacklisted))) {
      return true;
    }
  }
  return false;
}

type EventListener = (event: FunnelEvent) => void;

class AnalyticsTracker {
  private listeners: EventListener[] = [];

  public subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public track(name: FunnelEventName, payload?: FunnelEventPayload): void {
    // Whitelist-only construction: guaranteed zero sensitive properties or unexpected fields
    const sanitizedPayload: FunnelEventPayload = {};
    if (payload?.calculatorType) sanitizedPayload.calculatorType = payload.calculatorType;
    if (payload?.taxYear) sanitizedPayload.taxYear = payload.taxYear;
    if (payload?.plan) sanitizedPayload.plan = payload.plan;
    if (payload?.interval) sanitizedPayload.interval = payload.interval;
    if (payload?.source) sanitizedPayload.source = payload.source;
    if (payload?.hasWithholding !== undefined) sanitizedPayload.hasWithholding = payload.hasWithholding;

    const event: FunnelEvent = {
      name,
      payload: sanitizedPayload,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === "development") {
      // In development, log to assist debugging without external network requests
      // eslint-disable-next-line no-console
      console.debug("[Analytics Event]", event);
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        // Suppress listener errors to avoid impacting UI execution
      }
    });
  }
}

export const analytics = new AnalyticsTracker();
