import { FinalReturnSnapshot } from "@/lib/preparation/final-return-snapshot";
import { SubmissionLifecycleStatus } from "@/lib/efile/submission-lifecycle";

// =============================================================================
// 1. PROVIDER CONTRACT INTERFACES & TYPES
// =============================================================================

export interface ProviderValidationResult {
  isValid: boolean;
  mefSchemaVersion: string;
  errors: Array<{
    ruleNumber: string;
    path: string;
    description: string;
  }>;
}

export interface ProviderSubmissionResult {
  success: boolean;
  submissionId?: string;
  irsTransmissionTimestamp?: string;
  status: SubmissionLifecycleStatus;
  message: string;
}

export interface ProviderStatusResult {
  submissionId: string;
  status: SubmissionLifecycleStatus;
  irsSubmissionId?: string;
  receivedTimestamp?: string;
  acceptedTimestamp?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  message: string;
}

export interface ProviderRejectionDetails {
  submissionId: string;
  rejectionCode: string;
  category: string;
  irsRuleNumber: string;
  description: string;
  taxpayerAction: string;
}

export interface IEfileProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly isConnected: boolean;

  validateReturn(snapshot: FinalReturnSnapshot): Promise<ProviderValidationResult>;
  createSubmission(snapshot: FinalReturnSnapshot): Promise<ProviderSubmissionResult>;
  getSubmissionStatus(submissionId: string): Promise<ProviderStatusResult>;
  retrieveRejectionDetails(submissionId: string): Promise<ProviderRejectionDetails>;
}

// =============================================================================
// 2. DISCONNECTED / NULL PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * DisconnectedEfileProvider
 *
 * Safe default implementation when an IRS-authorized MeF transmitter is not connected.
 * In Phase 6 (Foundation Phase), this provider makes it explicit to taxpayers,
 * developers, and auditors that external electronic filing transmission is offline.
 *
 * CRITICAL SAFETY RULES:
 * - Never returns a fake submissionId or fake IRS timestamp.
 * - Never claims a return has been submitted or accepted.
 * - Explains clearly that TaxAIHelp prepares returns, but direct transmission is disconnected.
 */
export class DisconnectedEfileProvider implements IEfileProvider {
  public readonly providerId = "disconnected_null_provider";
  public readonly providerName = "TaxAIHelp Submission Foundation (Transmission Offline)";
  public readonly isConnected = false;

  public async validateReturn(_snapshot: FinalReturnSnapshot): Promise<ProviderValidationResult> {
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

  public async createSubmission(_snapshot: FinalReturnSnapshot): Promise<ProviderSubmissionResult> {
    return {
      success: false,
      status: "READY_TO_SUBMIT",
      message:
        "Electronic transmission unavailable. TaxAIHelp has prepared and validated your federal return, " +
        "but direct transmission to the IRS requires an authorized IRS MeF integration. " +
        "Please download, print, sign, and mail your official tax return documents, or provide them to your CPA.",
    };
  }

  public async getSubmissionStatus(submissionId: string): Promise<ProviderStatusResult> {
    return {
      submissionId,
      status: "READY_TO_SUBMIT",
      message: "No active external transmission connection.",
    };
  }

  public async retrieveRejectionDetails(submissionId: string): Promise<ProviderRejectionDetails> {
    return {
      submissionId,
      rejectionCode: "PROVIDER_NOT_CONNECTED",
      category: "CONFIGURATION",
      irsRuleNumber: "SYS-001",
      description: "Direct transmission provider is not connected in this environment.",
      taxpayerAction: "File via mail using the official PDF package or consult an authorized e-file preparer.",
    };
  }
}

// Global active provider instance (defaults to DisconnectedEfileProvider)
export const activeEfileProvider: IEfileProvider = new DisconnectedEfileProvider();
