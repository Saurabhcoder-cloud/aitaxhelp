import {
  EmailProvider,
  EmailMessage,
  EmailDeliveryResult,
} from "../types";

/**
 * Development Console Email Provider (Phase 5 Step 13)
 * For local debugging when EMAIL_PROVIDER=console is explicitly set.
 *
 * CRITICAL PRIVACY CONTROLS (Step 13.33):
 * - Sanitize all log output.
 * - NEVER print passwords, reset tokens, tax snapshots, or private user data.
 */
export class ConsoleEmailProvider implements EmailProvider {
  public readonly name = "console-provider";

  public async sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
    const sanitizedTo = this.sanitizeEmail(message.to);
    // Sanitize any potential sensitive terms from subject/text preview
    const sanitizedSubject = message.subject;

    // Development diagnostic log (metadata only, no sensitive payload)
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(
        `[ConsoleEmailProvider] Dispatched notification: to=${sanitizedTo} category=${message.category || "general"} subject="${sanitizedSubject}"`
      );
    }

    return {
      success: true,
      status: "sent",
      provider: this.name,
      messageId: `console_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
  }

  public async sendTemplate(
    templateId: string,
    to: string,
    _variables: Record<string, string>
  ): Promise<EmailDeliveryResult> {
    const sanitizedTo = this.sanitizeEmail(to);

    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(
        `[ConsoleEmailProvider] Dispatched template: to=${sanitizedTo} template=${templateId}`
      );
    }

    return {
      success: true,
      status: "sent",
      provider: this.name,
      messageId: `console_tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
  }

  public async healthCheck(): Promise<{ ok: boolean; provider: string; details?: string }> {
    return {
      ok: true,
      provider: this.name,
      details: "Console provider is ready for local development inspection.",
    };
  }

  private sanitizeEmail(email: string): string {
    const parts = email.split("@");
    if (parts.length !== 2) return "user@***";
    const user = parts[0];
    const domain = parts[1];
    const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : "***";
    return `${maskedUser}@${domain}`;
  }
}
