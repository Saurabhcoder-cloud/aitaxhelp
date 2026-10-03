/**
 * Federal E-File Provider Abstraction & Adapters — Phase 10
 *
 * Implements:
 * 1. DisconnectedEfileProvider (Fail-closed safe default)
 * 2. MockFederalEfileProvider (Development & automated testing only, clearly marked TEST ONLY)
 * 3. Provider Configuration Boundary & Factory
 *
 * SAFETY INVARIANTS:
 * - Production deployments FAIL CLOSED when authorized provider configuration is absent.
 * - Mock provider is STRICTLY prohibited in production environments.
 * - Zero fake IRS credentials, fake EFIN/ETIN, or fake transmission claims.
 */

import crypto from "crypto";
import { FinalReturnSnapshot } from "@/lib/preparation/final-return-snapshot";
import {
  IFederalEfileProvider,
  ProviderCapabilities,
  ProviderValidationResult,
  ProviderSubmissionResult,
  ProviderStatusResult,
  ProviderRejectionDetails,
  CanonicalEfilePayload,
} from "./types";
import { AppError } from "@/lib/utils/errors";

// =============================================================================
// 1. DISCONNECTED SAFE DEFAULT PROVIDER
// =============================================================================

export class DisconnectedEfileProvider implements IFederalEfileProvider {
  public readonly providerId = "disconnected_null_provider";
  public readonly providerName = "TaxAIHelp Submission Foundation (Transmission Offline)";
  public readonly isConnected = false;
  public readonly isMock = false;

  public getCapabilities(): ProviderCapabilities {
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      supportsRealTransmission: false,
      supportsWebhooks: false,
      supportsStatusPolling: false,
      supportsCancellation: false,
      supportedTaxYears: [2025, 2026],
      isMock: false,
    };
  }

  public async validateSubmission(_snapshot: FinalReturnSnapshot): Promise<ProviderValidationResult> {
    return {
      isValid: false,
      mefSchemaVersion: "2026v1.0-unconnected",
      errors: [
        {
          ruleNumber: "EFILE-PROVIDER-DISCONNECTED",
          path: "provider.connection",
          description:
            "External IRS MeF transmission provider is not connected in this deployment. " +
            "Direct electronic transmission to the IRS is unavailable.",
        },
      ],
    };
  }

  // Phase 6 backward-compatible aliases
  public async validateReturn(snapshot: FinalReturnSnapshot): Promise<ProviderValidationResult> {
    return this.validateSubmission(snapshot);
  }

  public async createSubmission(snapshot: FinalReturnSnapshot): Promise<ProviderSubmissionResult> {
    return this.submit(snapshot, {} as any, "");
  }

  public async submit(
    _snapshot: FinalReturnSnapshot,
    _payload: CanonicalEfilePayload,
    _idempotencyKey: string
  ): Promise<ProviderSubmissionResult> {
    return {
      success: false,
      status: "READY_TO_SUBMIT",
      responseType: "SERVICE_UNAVAILABLE",
      message:
        "Electronic transmission unavailable. TaxAIHelp has prepared and validated your federal return, " +
        "but direct transmission to the IRS requires an authorized IRS MeF integration. " +
        "Please download, print, sign, and mail your official tax return documents, or provide them to your CPA.",
    };
  }

  public async getSubmissionStatus(submissionId: string): Promise<ProviderStatusResult> {
    return {
      submissionId,
      providerSubmissionId: "DISCONNECTED",
      status: "READY_TO_SUBMIT",
      responseType: "SERVICE_UNAVAILABLE",
      message: "No active external transmission connection.",
    };
  }

  public parseAcknowledgement(_rawPayload: unknown): ProviderStatusResult {
    throw new AppError("Cannot parse acknowledgement: Provider disconnected.", 400, "PROVIDER_DISCONNECTED");
  }

  public parseRejection(_rawPayload: unknown): ProviderRejectionDetails {
    return {
      submissionId: "DISCONNECTED",
      rejectionCode: "PROVIDER_NOT_CONNECTED",
      category: "CONFIGURATION",
      irsRuleNumber: "SYS-001",
      description: "Direct transmission provider is not connected in this environment.",
      taxpayerAction: "File via mail using the official PDF package or consult an authorized e-file preparer.",
    };
  }

  public verifyWebhookSignature(_rawBody: string, _signatureHeader?: string): boolean {
    return false;
  }
}

// =============================================================================
// 2. MOCK / TEST PROVIDER (AUTOMATED TESTS & DEVELOPMENT ONLY)
// =============================================================================

export type MockBehaviorMode =
  | "SUCCESS"
  | "VALIDATION_FAILED"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "REJECTED"
  | "SIMULATE_ACCEPTANCE";

export class MockFederalEfileProvider implements IFederalEfileProvider {
  public readonly providerId = "mock_federal_efile_provider";
  public readonly providerName = "TaxAIHelp Mock/Sandbox E-File Transmitter (TEST ONLY — NOT FILED WITH IRS)";
  public readonly isConnected = true;
  public readonly isMock = true;

  private behaviorMode: MockBehaviorMode = "SUCCESS";
  private webhookSecret = "test-mock-webhook-secret-key-12345";

  constructor(initialMode: MockBehaviorMode = "SUCCESS") {
    this.behaviorMode = initialMode;
  }

  public setBehaviorMode(mode: MockBehaviorMode): void {
    this.behaviorMode = mode;
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      supportsRealTransmission: false,
      supportsWebhooks: true,
      supportsStatusPolling: true,
      supportsCancellation: true,
      supportedTaxYears: [2025, 2026],
      isMock: true,
    };
  }

  public async validateSubmission(snapshot: FinalReturnSnapshot): Promise<ProviderValidationResult> {
    if (this.behaviorMode === "VALIDATION_FAILED") {
      return {
        isValid: false,
        mefSchemaVersion: "2026v1.0-mock",
        errors: [
          {
            ruleNumber: "R0000-001-TEST",
            path: "ReturnData.IRS1040.PrimarySSN",
            description: "Simulated MeF schema error: Test SSN failed provider checksum format.",
          },
        ],
      };
    }

    return {
      isValid: true,
      mefSchemaVersion: "2026v1.0-mock",
      errors: [],
    };
  }

  public async submit(
    snapshot: FinalReturnSnapshot,
    _payload: CanonicalEfilePayload,
    _idempotencyKey: string
  ): Promise<ProviderSubmissionResult> {
    const now = new Date().toISOString();

    if (this.behaviorMode === "TIMEOUT") {
      return {
        success: false,
        status: "FAILED",
        responseType: "TIMEOUT",
        message: "Simulated transmission timeout: Mock upstream provider did not respond within 30,000ms.",
        isSimulated: true,
      };
    }

    if (this.behaviorMode === "SERVICE_UNAVAILABLE") {
      return {
        success: false,
        status: "FAILED",
        responseType: "SERVICE_UNAVAILABLE",
        message: "Simulated 503 Service Unavailable: Mock upstream transmitter gateway is undergoing maintenance.",
        isSimulated: true,
      };
    }

    if (this.behaviorMode === "VALIDATION_FAILED") {
      return {
        success: false,
        status: "READY_TO_SUBMIT",
        responseType: "VALIDATION_FAILED",
        message: "Provider pre-flight validation failed: Simulated MeF schema rule violation.",
        isSimulated: true,
      };
    }

    if (this.behaviorMode === "REJECTED") {
      const mockSubId = `MOCK-SUB-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      return {
        success: false,
        providerSubmissionId: mockSubId,
        providerCorrelationId: `CORR-${snapshot.sessionId.slice(0, 8)}`,
        status: "REJECTED",
        responseType: "IRS_REJECTED",
        message: "Simulated IRS MeF Rejection: F1040-001 — Name control does not match IRS database (TEST ONLY).",
        irsTransmissionTimestamp: now,
        isSimulated: true,
      };
    }

    if (this.behaviorMode === "SIMULATE_ACCEPTANCE") {
      const mockSubId = `MOCK-SUB-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      return {
        success: true,
        providerSubmissionId: mockSubId,
        providerCorrelationId: `CORR-${snapshot.sessionId.slice(0, 8)}`,
        status: "ACCEPTED",
        responseType: "IRS_ACCEPTED",
        message: "Simulated IRS Acceptance: Test return accepted by Mock Transmitter (TEST ONLY — NOT FILED WITH IRS).",
        irsTransmissionTimestamp: now,
        isSimulated: true,
      };
    }

    // Default: SUCCESS -> SUBMITTED (awaiting acknowledgement)
    const mockSubId = `MOCK-SUB-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    return {
      success: true,
      providerSubmissionId: mockSubId,
      providerCorrelationId: `CORR-${snapshot.sessionId.slice(0, 8)}`,
      status: "SUBMITTED",
      responseType: "PROVIDER_RECEIVED",
      message: "Test return received by Mock Provider. (TEST SUBMISSION ONLY — NOT TRANSMITTED TO ACTUAL IRS).",
      irsTransmissionTimestamp: now,
      isSimulated: true,
    };
  }

  public async getSubmissionStatus(providerSubmissionId: string): Promise<ProviderStatusResult> {
    const now = new Date().toISOString();

    if (this.behaviorMode === "REJECTED") {
      return {
        submissionId: providerSubmissionId,
        providerSubmissionId,
        status: "REJECTED",
        responseType: "IRS_REJECTED",
        rejectionCode: "R0000-002",
        rejectionReason: "Simulated rejection: Primary SSN already filed for tax year (TEST ONLY).",
        rejectionRuleNumber: "F1040-510",
        taxpayerAction: "Verify taxpayer SSN or attach paper Form 14039 if identity theft is suspected.",
        message: "Simulated rejection received.",
      };
    }

    if (this.behaviorMode === "SIMULATE_ACCEPTANCE") {
      return {
        submissionId: providerSubmissionId,
        providerSubmissionId,
        status: "ACCEPTED",
        responseType: "IRS_ACCEPTED",
        irsSubmissionId: `IRS-TEST-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        acceptedTimestamp: now,
        message: "Simulated acceptance confirmed (TEST ONLY).",
      };
    }

    return {
      submissionId: providerSubmissionId,
      providerSubmissionId,
      status: "SUBMITTED",
      responseType: "PROVIDER_RECEIVED",
      receivedTimestamp: now,
      message: "Submission in flight at mock gateway.",
    };
  }

  public parseAcknowledgement(rawPayload: unknown): ProviderStatusResult {
    const p = (rawPayload || {}) as Record<string, unknown>;
    return {
      submissionId: (p.submissionId as string) || "MOCK-SUB",
      providerSubmissionId: (p.providerSubmissionId as string) || "MOCK-SUB",
      status: (p.status as any) || "ACKNOWLEDGED",
      responseType: "IRS_ACKNOWLEDGED",
      message: "Parsed mock acknowledgement payload.",
      rawResponse: rawPayload,
    };
  }

  public parseRejection(rawPayload: unknown): ProviderRejectionDetails {
    const p = (rawPayload || {}) as Record<string, unknown>;
    return {
      submissionId: (p.submissionId as string) || "MOCK-SUB",
      rejectionCode: (p.rejectionCode as string) || "MOCK-REJ-01",
      category: "BUSINESS_RULE",
      irsRuleNumber: (p.ruleNumber as string) || "RULE-999",
      description: (p.message as string) || "Mock rejection description.",
      taxpayerAction: (p.action as string) || "Review entered data and retry.",
    };
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;
    // Expected signature: sha256 HMAC of rawBody
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    return signatureHeader === expected || signatureHeader === `sha256=${expected}`;
  }

  public generateTestWebhookSignature(rawBody: string): string {
    return crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }
}

// =============================================================================
// 3. PROVIDER CONFIGURATION FACTORY & GLOBAL INSTANCE
// =============================================================================

let overriddenProvider: IFederalEfileProvider | null = null;

export function getActiveEfileProvider(): IFederalEfileProvider {
  if (overriddenProvider) {
    return overriddenProvider;
  }

  const configuredProvider = process.env.EFILE_PROVIDER?.toLowerCase() || "disabled";
  const isProd = process.env.NODE_ENV === "production";

  // CRITICAL FAIL-CLOSED PRODUCTION GUARD:
  // Mock provider is never permitted in production.
  if (isProd && configuredProvider === "mock") {
    return new DisconnectedEfileProvider();
  }

  if (configuredProvider === "mock") {
    return new MockFederalEfileProvider();
  }

  // Default fail-closed provider
  return new DisconnectedEfileProvider();
}

/**
 * Global active provider instance getter.
 */
export const activeEfileProvider: IFederalEfileProvider = {
  get providerId() {
    return getActiveEfileProvider().providerId;
  },
  get providerName() {
    return getActiveEfileProvider().providerName;
  },
  get isConnected() {
    return getActiveEfileProvider().isConnected;
  },
  get isMock() {
    return getActiveEfileProvider().isMock;
  },
  getCapabilities() {
    return getActiveEfileProvider().getCapabilities();
  },
  validateSubmission(s) {
    return getActiveEfileProvider().validateSubmission(s);
  },
  submit(s, p, k) {
    return getActiveEfileProvider().submit(s, p, k);
  },
  getSubmissionStatus(id) {
    return getActiveEfileProvider().getSubmissionStatus(id);
  },
  parseAcknowledgement(p) {
    return getActiveEfileProvider().parseAcknowledgement(p);
  },
  parseRejection(p) {
    return getActiveEfileProvider().parseRejection(p);
  },
  verifyWebhookSignature(b, h) {
    return getActiveEfileProvider().verifyWebhookSignature(b, h);
  },
};

/**
 * Test override setter to inject providers during test runs.
 */
export function setEfileProviderForTesting(provider: IFederalEfileProvider | null): void {
  overriddenProvider = provider;
}
