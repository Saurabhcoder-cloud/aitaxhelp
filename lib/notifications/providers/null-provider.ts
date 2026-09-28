import {
  EmailProvider,
  EmailMessage,
  EmailDeliveryResult,
} from "../types";

/**
 * Null Email Provider (Phase 5 Step 13)
 * Default safe provider when no third-party email service credentials are configured.
 *
 * CRITICAL REQUIREMENTS (Step 13.4):
 * - Never pretend an email was delivered.
 * - Return status 'provider_unconfigured' or 'skipped', NEVER 'sent'.
 * - Never expose secrets or sensitive configuration.
 */
export class NullEmailProvider implements EmailProvider {
  public readonly name = "null-provider";

  public async sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
    return {
      success: false,
      status: "provider_unconfigured",
      provider: this.name,
      messageId: undefined,
      error: "Email provider is unconfigured. Delivery was skipped safely.",
      timestamp: new Date().toISOString(),
    };
  }

  public async sendTemplate(
    templateId: string,
    to: string,
    _variables: Record<string, string>
  ): Promise<EmailDeliveryResult> {
    return {
      success: false,
      status: "provider_unconfigured",
      provider: this.name,
      messageId: undefined,
      error: `Email provider unconfigured for template ${templateId} to ${to}.`,
      timestamp: new Date().toISOString(),
    };
  }

  public async healthCheck(): Promise<{ ok: boolean; provider: string; details?: string }> {
    return {
      ok: false,
      provider: this.name,
      details: "No live transactional email provider is configured (operating in safe null mode).",
    };
  }
}
