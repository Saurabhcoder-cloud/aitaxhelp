/**
 * Centralized Email Templates (Phase 5 Step 13)
 * Provides 15 production templates with strict HTML sanitization,
 * plain-text alternatives, and zero sensitive tax calculation figures.
 */

export interface RenderedTemplate {
  subject: string;
  text: string;
  html: string;
  category: "authentication" | "calculations" | "ai" | "billing" | "professional" | "system" | "support";
  isSecurityCritical: boolean;
}

/**
 * Escapes user-controlled strings to prevent HTML injection.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function baseHtmlWrapper({
  title,
  bodyContent,
  ctaUrl,
  ctaLabel,
  unsubscribeUrl,
}: {
  title: string;
  bodyContent: string;
  ctaUrl?: string;
  ctaLabel?: string;
  unsubscribeUrl?: string;
}): string {
  const safeTitle = escapeHtml(title);
  const safeCtaLabel = ctaLabel ? escapeHtml(ctaLabel) : undefined;
  const safeCtaUrl = ctaUrl ? escapeHtml(ctaUrl) : undefined;
  const safeUnsubscribeUrl = unsubscribeUrl ? escapeHtml(unsubscribeUrl) : undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; line-height: 1.5; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { padding: 24px 32px; background: #0f172a; color: #ffffff; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .content { padding: 32px; font-size: 14px; color: #334155; }
    .cta-button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 20px; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; }
    .footer a { color: #64748b; text-decoration: underline; }
    .disclaimer { font-size: 11px; color: #94a3b8; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TaxAI<span style="color: #38bdf8;">Help</span></h1>
    </div>
    <div class="content">
      ${bodyContent}
      ${
        safeCtaUrl && safeCtaLabel
          ? `<div><a href="${safeCtaUrl}" class="cta-button">${safeCtaLabel}</a></div>`
          : ""
      }
    </div>
    <div class="footer">
      <p>TaxAIHelp &bull; Smarter Tax Help, Powered by AI</p>
      <p>
        <a href="https://taxaihelp.com/privacy">Privacy Policy</a> &bull;
        <a href="https://taxaihelp.com/terms">Terms of Service</a> &bull;
        <a href="https://taxaihelp.com/disclaimer">Tax Disclaimer</a>
      </p>
      ${
        safeUnsubscribeUrl
          ? `<p><a href="${safeUnsubscribeUrl}">Manage communication preferences</a></p>`
          : ""
      }
      <p class="disclaimer">TaxAIHelp provides educational calculations and insights. We are not the IRS or a CPA firm.</p>
    </div>
  </div>
</body>
</html>`;
}

export class NotificationTemplates {
  /**
   * 1. Welcome Email
   */
  public static welcome(variables: { name?: string; siteUrl: string }): RenderedTemplate {
    const safeName = variables.name ? escapeHtml(variables.name) : "Taxpayer";
    const subject = "Welcome to TaxAIHelp — Smarter US Tax Intelligence";
    const text = `Welcome to TaxAIHelp, ${safeName}!\n\nYour account is ready. Access deterministic federal tax calculators, saved calculation history, and our AI tax assistant.\n\nVisit your dashboard: ${variables.siteUrl}/dashboard\n\nTaxAIHelp Support`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Welcome, ${safeName}!</h2><p>Your TaxAIHelp account has been successfully created. You now have access to precision federal tax calculators, scenario comparisons, and conversational AI guidance.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard`,
      ctaLabel: "Go to Dashboard",
    });
    return { subject, text, html, category: "authentication", isSecurityCritical: false };
  }

  /**
   * 2. Email Verification
   */
  public static emailVerification(variables: {
    verificationUrl: string;
    siteUrl: string;
  }): RenderedTemplate {
    const subject = "Verify your email address for TaxAIHelp";
    const text = `Please verify your email address for your TaxAIHelp account by visiting:\n${variables.verificationUrl}\n\nThis link expires in 24 hours.\nIf you did not request this, please disregard this email.`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Confirm Your Email Address</h2><p>Please click the button below to verify your email address and activate all features of your TaxAIHelp account. This link will expire in 24 hours.</p>`,
      ctaUrl: variables.verificationUrl,
      ctaLabel: "Verify Email Address",
    });
    return { subject, text, html, category: "authentication", isSecurityCritical: true };
  }

  /**
   * 3. Password Reset Request
   */
  public static passwordReset(variables: {
    resetUrl: string;
    siteUrl: string;
  }): RenderedTemplate {
    const subject = "Reset your TaxAIHelp password";
    const text = `A password reset was requested for your TaxAIHelp account.\n\nReset your password here:\n${variables.resetUrl}\n\nThis link is short-lived and will expire soon.\nIf you did not request this change, your account remains secure and you can safely ignore this email.`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Password Reset Request</h2><p>We received a request to reset your password. Click the button below to choose a new password. For security, this link is valid for a limited time.</p><p style="color: #64748b; font-size: 13px;">If you did not request a password reset, no action is needed.</p>`,
      ctaUrl: variables.resetUrl,
      ctaLabel: "Reset Password",
    });
    return { subject, text, html, category: "authentication", isSecurityCritical: true };
  }

  /**
   * 4. Password Changed / Security Alert
   */
  public static passwordChanged(variables: { siteUrl: string }): RenderedTemplate {
    const subject = "Security Alert: Your TaxAIHelp password was changed";
    const text = `The password for your TaxAIHelp account was recently changed.\n\nIf you made this change, you can safely ignore this message.\n\nIf you did not make this change, please reset your password immediately and contact support: ${variables.siteUrl}/forgot-password`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Password Changed Successfully</h2><p>The password for your TaxAIHelp account was recently modified.</p><p style="color: #b91c1c; font-weight: 600;">If you did not initiate this change, please secure your account immediately by resetting your password and contacting our team.</p>`,
      ctaUrl: `${variables.siteUrl}/forgot-password`,
      ctaLabel: "Secure Account",
    });
    return { subject, text, html, category: "authentication", isSecurityCritical: true };
  }

  /**
   * 5. Calculation Saved
   */
  public static calculationSaved(variables: {
    calculationTitle: string;
    calculationId: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeTitle = escapeHtml(variables.calculationTitle);
    const subject = `Tax calculation saved: ${safeTitle}`;
    const text = `Your tax calculation "${variables.calculationTitle}" has been saved to your secure calculation history.\n\nView it in your authenticated dashboard: ${variables.siteUrl}/dashboard/calculations`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Calculation Saved</h2><p>Your calculation <strong>"${safeTitle}"</strong> has been safely stored in your account history. You can review scenario insights, compare projections, or generate printable reports at any time.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/calculations`,
      ctaLabel: "View Saved Calculations",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "calculations", isSecurityCritical: false };
  }

  /**
   * 6. Tax Report Ready
   */
  public static taxReportReady(variables: {
    reportTitle: string;
    calculationId: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeTitle = escapeHtml(variables.reportTitle);
    const subject = `Your TaxAIHelp report is ready: ${safeTitle}`;
    const text = `Your tax summary report "${variables.reportTitle}" is ready for review in your account.\n\nSign in to view your report: ${variables.siteUrl}/dashboard/calculations`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Tax Summary Report Ready</h2><p>Your comprehensive report for <strong>"${safeTitle}"</strong> is ready for review or export. For your privacy, sensitive financial figures are not included in this email.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/calculations`,
      ctaLabel: "Open Secure Report",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "calculations", isSecurityCritical: false };
  }

  /**
   * 7. AI Quota Warning (e.g., 80% used)
   */
  public static aiQuotaWarning(variables: {
    usedCount: number;
    maxCount: number;
    siteUrl: string;
  }): RenderedTemplate {
    const subject = "You have used 80% of your daily AI tax queries";
    const text = `You have used ${variables.usedCount} of your ${variables.maxCount} daily AI tax queries.\nYour quota resets at 00:00 UTC daily. Upgrade to Premium for 100 queries per day: ${variables.siteUrl}/pricing`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Daily AI Query Capacity Notice</h2><p>You have utilized <strong>${variables.usedCount} of ${variables.maxCount}</strong> queries for today. Your daily limit resets at 00:00 UTC.</p><p>Need continuous high-capacity assistance for tax season? Explore our Premium plan.</p>`,
      ctaUrl: `${variables.siteUrl}/pricing`,
      ctaLabel: "View Premium Plans",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "ai", isSecurityCritical: false };
  }

  /**
   * 8. AI Quota Reached (100% used)
   */
  public static aiQuotaReached(variables: {
    maxCount: number;
    siteUrl: string;
  }): RenderedTemplate {
    const subject = "Daily AI tax query limit reached";
    const text = `You have reached your daily limit of ${variables.maxCount} AI queries. Your quota will reset automatically at 00:00 UTC.\n\nTo continue asking questions now, upgrade to Premium: ${variables.siteUrl}/pricing`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Daily Limit Reached</h2><p>You have reached your daily allocation of <strong>${variables.maxCount} AI queries</strong>. Your allocation will automatically reset at 00:00 UTC.</p><p>Core deterministic calculators remain completely unlimited and free to use.</p>`,
      ctaUrl: `${variables.siteUrl}/pricing`,
      ctaLabel: "Upgrade for 100 Daily Queries",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "ai", isSecurityCritical: false };
  }

  /**
   * 9. Subscription Confirmation
   */
  public static subscriptionConfirmation(variables: {
    planName: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safePlan = escapeHtml(variables.planName);
    const subject = `Welcome to TaxAIHelp ${safePlan}!`;
    const text = `Your subscription to TaxAIHelp ${variables.planName} is active.\n\nYou now have expanded daily AI queries, unlocked printable reports, and advanced planning insights.\n\nManage subscription: ${variables.siteUrl}/dashboard/billing`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Subscription Activated</h2><p>Thank you for choosing <strong>TaxAIHelp ${safePlan}</strong>. Your plan entitlements have been activated across your account.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/billing`,
      ctaLabel: "Manage Billing & Features",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "billing", isSecurityCritical: false };
  }

  /**
   * 10. Subscription Cancellation
   */
  public static subscriptionCancellation(variables: {
    planName: string;
    effectiveDate: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safePlan = escapeHtml(variables.planName);
    const safeDate = escapeHtml(variables.effectiveDate);
    const subject = `TaxAIHelp ${safePlan} cancellation confirmed`;
    const text = `Your ${variables.planName} subscription cancellation is confirmed. You will retain access until ${variables.effectiveDate}.\n\nYour saved calculations and profile will remain intact.\nManage: ${variables.siteUrl}/dashboard/billing`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Subscription Cancellation</h2><p>Your <strong>${safePlan}</strong> subscription has been cancelled. You will continue to have access to Premium features through <strong>${safeDate}</strong>.</p><p>All saved calculations and account history remain permanently accessible on the free plan.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/billing`,
      ctaLabel: "View Account Status",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "billing", isSecurityCritical: false };
  }

  /**
   * 11. Payment Failure Notice
   */
  public static paymentFailure(variables: { siteUrl: string }): RenderedTemplate {
    const subject = "Action Required: TaxAIHelp payment unsuccessful";
    const text = `We were unable to process the renewal payment for your TaxAIHelp subscription.\n\nPlease update your payment details to prevent interruption of Premium features: ${variables.siteUrl}/dashboard/billing`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Payment Processing Unsuccessful</h2><p>We were unable to renew your subscription with the payment method on file. Please visit your billing settings to update your information.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/billing`,
      ctaLabel: "Update Payment Method",
    });
    return { subject, text, html, category: "billing", isSecurityCritical: true };
  }

  /**
   * 12. Professional Handoff Received
   */
  public static professionalHandoffReceived(variables: {
    leadId: string;
    siteUrl: string;
  }): RenderedTemplate {
    const subject = "Your CPA/EA consultation request has been received";
    const text = `Thank you for your inquiry. Your request for a licensed CPA / Enrolled Agent consultation has been submitted.\n\nA qualified professional will review your scenario details and contact you via your preferred method.\nView status: ${variables.siteUrl}/dashboard`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Consultation Inquiry Received</h2><p>Your request to connect with an independent CPA or Enrolled Agent has been safely submitted. A tax professional will reach out to discuss your tax situation.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard`,
      ctaLabel: "Check Dashboard",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "professional", isSecurityCritical: false };
  }

  /**
   * 13. Important Security / Service Notice
   */
  public static securityNotice(variables: {
    title: string;
    message: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeTitle = escapeHtml(variables.title);
    const safeMsg = escapeHtml(variables.message);
    const subject = `Security Notice: ${safeTitle}`;
    const text = `Important Security Notice: ${variables.title}\n\n${variables.message}\n\nReview your account: ${variables.siteUrl}/dashboard/settings`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>${safeTitle}</h2><p>${safeMsg}</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/settings`,
      ctaLabel: "Review Account Security",
    });
    return { subject, text, html, category: "authentication", isSecurityCritical: true };
  }

  /**
   * 14. Privacy Policy Update
   */
  public static privacyUpdate(variables: {
    effectiveDate: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeDate = escapeHtml(variables.effectiveDate);
    const subject = "Notice: Updates to our Privacy Policy";
    const text = `We have updated our Privacy Policy effective ${variables.effectiveDate}.\n\nReview the updated policy: ${variables.siteUrl}/privacy`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Privacy Policy Update</h2><p>We are writing to notify you of recent updates to our Privacy Policy, effective <strong>${safeDate}</strong>. We encourage you to review our enhanced disclosures regarding data handling, AI boundaries, and privacy rights.</p>`,
      ctaUrl: `${variables.siteUrl}/privacy`,
      ctaLabel: "Read Privacy Policy",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "system", isSecurityCritical: false };
  }

  /**
   * 15. Terms of Service Update
   */
  public static termsUpdate(variables: {
    effectiveDate: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeDate = escapeHtml(variables.effectiveDate);
    const subject = "Notice: Updates to our Terms of Service";
    const text = `We have updated our Terms of Service effective ${variables.effectiveDate}.\n\nReview the updated terms: ${variables.siteUrl}/terms`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Terms of Service Update</h2><p>Our Terms of Service have been updated effective <strong>${safeDate}</strong>. These updates clarify software scope, subscription terms, and user guidelines.</p>`,
      ctaUrl: `${variables.siteUrl}/terms`,
      ctaLabel: "Read Terms of Service",
      unsubscribeUrl: `${variables.siteUrl}/dashboard/settings/notifications`,
    });
    return { subject, text, html, category: "system", isSecurityCritical: false };
  }

  /**
   * 16. Support Ticket Confirmation (Phase 5 Step 16)
   */
  public static supportTicketCreated(variables: {
    ticketNumber: string;
    subject: string;
    ticketId: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeTicketNum = escapeHtml(variables.ticketNumber);
    const safeSubj = escapeHtml(variables.subject);
    const subject = `[${variables.ticketNumber}] Support Request Received: ${variables.subject}`;
    const text = `Your support request ${variables.ticketNumber} ("${variables.subject}") has been received. Our team will review it shortly.\n\nView ticket: ${variables.siteUrl}/dashboard/support/${variables.ticketId}`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Support Request Received</h2><p>We have received your support request for <strong>${safeTicketNum}</strong>: <em>${safeSubj}</em>.</p><p>Our operations team has been notified. You can review updates or add details to this ticket directly from your dashboard.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/support/${variables.ticketId}`,
      ctaLabel: "View Support Request",
    });
    return { subject, text, html, category: "support", isSecurityCritical: false };
  }

  /**
   * 17. Support Ticket Reply
   */
  public static supportTicketReply(variables: {
    ticketNumber: string;
    subject: string;
    ticketId: string;
    replyExcerpt: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeTicketNum = escapeHtml(variables.ticketNumber);
    const safeExcerpt = escapeHtml(variables.replyExcerpt);
    const subject = `[${variables.ticketNumber}] New Reply on Your Support Request`;
    const text = `A member of the TaxAIHelp support team has replied to ticket ${variables.ticketNumber}:\n\n"${variables.replyExcerpt}"\n\nView response: ${variables.siteUrl}/dashboard/support/${variables.ticketId}`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>New Support Reply</h2><p>Our team has posted a reply to your support request <strong>${safeTicketNum}</strong>:</p><blockquote style="border-left: 3px solid #2563eb; padding-left: 16px; margin: 16px 0; color: #475569; font-style: italic;">${safeExcerpt}</blockquote><p>Please log in to your dashboard to review the full conversation or respond.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/support/${variables.ticketId}`,
      ctaLabel: "View Ticket & Reply",
    });
    return { subject, text, html, category: "support", isSecurityCritical: false };
  }

  /**
   * 18. Support Ticket Status Changed
   */
  public static supportTicketStatusChanged(variables: {
    ticketNumber: string;
    subject: string;
    newStatus: string;
    ticketId: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeTicketNum = escapeHtml(variables.ticketNumber);
    const safeStatus = escapeHtml(variables.newStatus);
    const subject = `[${variables.ticketNumber}] Ticket Status Updated to ${variables.newStatus}`;
    const text = `The status of your support request ${variables.ticketNumber} has been updated to "${variables.newStatus}".\n\nView ticket: ${variables.siteUrl}/dashboard/support/${variables.ticketId}`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Support Ticket Status Update</h2><p>Your support request <strong>${safeTicketNum}</strong> has been updated to status: <strong style="color: #2563eb;">${safeStatus}</strong>.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/support/${variables.ticketId}`,
      ctaLabel: "View Support Request",
    });
    return { subject, text, html, category: "support", isSecurityCritical: false };
  }

  /**
   * 19. Support Ticket Resolved
   */
  public static supportTicketResolved(variables: {
    ticketNumber: string;
    subject: string;
    ticketId: string;
    siteUrl: string;
  }): RenderedTemplate {
    const safeTicketNum = escapeHtml(variables.ticketNumber);
    const subject = `[${variables.ticketNumber}] Your Support Request Has Been Resolved`;
    const text = `Your support request ${variables.ticketNumber} has been marked as resolved. If you need further assistance, you may reopen this ticket from your dashboard.\n\nView ticket: ${variables.siteUrl}/dashboard/support/${variables.ticketId}`;
    const html = baseHtmlWrapper({
      title: subject,
      bodyContent: `<h2>Support Ticket Resolved</h2><p>Your support request <strong>${safeTicketNum}</strong> has been marked as resolved by our team.</p><p>If you require any further assistance, you can reopen this ticket or submit a new inquiry at any time.</p>`,
      ctaUrl: `${variables.siteUrl}/dashboard/support/${variables.ticketId}`,
      ctaLabel: "View Resolved Ticket",
    });
    return { subject, text, html, category: "support", isSecurityCritical: false };
  }
}
